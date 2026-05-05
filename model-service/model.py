"""
model.py — loads the bundled ClinicalProstatePredictor from
prostate_cancer_predictor.pkl and exposes a predict() function consumed
by main.py.

The single .pkl file bundles: trained model, scaler, encoders (family_history
encoder removed — it is now a raw float), feature names, reverse risk mapping,
feature_importance_series, and a predict() method.

predict(patient_inputs, symptom_dict) returns full clinical output including:
- age gate eligibility check
- symptom post-prediction adjustment layer
- structured family history detail block
- raw symptom dict for heatmap rendering
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────

MODELS_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).parent / "models"))


# ── Clinical constants ─────────────────────────────────────────────────────────

SYMPTOM_DEFINITIONS: list[dict] = [
    {"key": "difficulty_urination",  "display": "Difficulty in urination (hesitancy, weak stream)", "weight": 0.08},
    {"key": "increased_frequency",   "display": "Increased urinary frequency (day/night)",          "weight": 0.06},
    {"key": "urinary_retention",     "display": "Urinary retention",                                "weight": 0.18},
    {"key": "haematuria",            "display": "Haematuria (blood in urine)",                      "weight": 0.20},
    {"key": "dysuria",               "display": "Dysuria (painful urination)",                      "weight": 0.06},
    {"key": "pelvic_discomfort",     "display": "Lower abdominal/pelvic discomfort",                "weight": 0.06},
    {"key": "perineal_pain",         "display": "Perineal or rectal pain",                          "weight": 0.07},
    {"key": "back_pain",             "display": "Back pain (lumbar/sacral)",                        "weight": 0.08},
    {"key": "bone_pain",             "display": "Bone pain (generalised or localised)",             "weight": 0.18},
    {"key": "leg_weakness",          "display": "Leg weakness or paralysis",                        "weight": 0.20},
    {"key": "urinary_incontinence",  "display": "Urinary incontinence",                             "weight": 0.06},
    {"key": "weight_loss",           "display": "Weight loss",                                      "weight": 0.08},
    {"key": "fatigue",               "display": "Fatigue or generalised body weakness",             "weight": 0.05},
    {"key": "erectile_dysfunction",  "display": "Erectile dysfunction",                             "weight": 0.04},
    {"key": "others",                "display": "Others (specify)",                                 "weight": 0.03},
]

FAMILY_HISTORY_WEIGHTS: dict[str, float] = {
    "father":               0.40,
    "brother":              0.35,
    "paternal_grandfather": 0.15,
    "maternal_grandfather": 0.10,
}

FAMILY_HISTORY_RELATIVE_LABELS: dict[str, str] = {
    "father":               "Father",
    "brother":              "Brother",
    "paternal_grandfather": "Paternal Grandfather",
    "maternal_grandfather": "Maternal Grandfather",
}

URGENT_SYMPTOM_THRESHOLD = 0.18


# ── Module-level helper functions (resolved by pickle at call time) ───────────

def get_patient_factor_direction(feature_name: str,
                                  encoded_value: float,
                                  predicted_label: str) -> str:
    risk_increasing_direction: dict[str, str] = {
        "age":                     "high",
        "bmi":                     "high",
        "smoker":                  "high",
        "alcohol_consumption":     "high",
        "diet_type":               "low",
        "physical_activity_level": "low",
        "family_history":          "high",
        "regular_health_checkup":  "low",
        "prostate_exam_done":      "low",
        "bmi_category":            "high",
        "age_group":               "high",
        "risk_factor_count":       "high",
    }

    direction = risk_increasing_direction.get(feature_name, "high")

    if feature_name == "age":
        increases_risk = encoded_value >= 55
    elif feature_name == "bmi":
        increases_risk = encoded_value >= 25.0
    elif feature_name == "risk_factor_count":
        increases_risk = encoded_value >= 2
    elif feature_name == "family_history":
        increases_risk = encoded_value >= 0.35
    elif direction == "high":
        increases_risk = encoded_value >= 1
    else:
        increases_risk = encoded_value <= 0

    return "Increased risk" if increases_risk else "Decreased risk"


def get_clinical_note(feature: str, patient_inputs_raw: dict) -> str:
    pal      = str(patient_inputs_raw.get("physical_activity_level", "")).lower()
    diet     = str(patient_inputs_raw.get("diet_type", "")).lower()
    alcohol  = str(patient_inputs_raw.get("alcohol_consumption", "")).lower()
    bmi      = float(patient_inputs_raw.get("bmi", 0))
    bmi_cat  = str(patient_inputs_raw.get("bmi_category", ""))
    age      = float(patient_inputs_raw.get("age", 0))
    age_grp  = str(patient_inputs_raw.get("age_group", ""))
    rfc      = int(patient_inputs_raw.get("risk_factor_count", 0))
    smoker   = str(patient_inputs_raw.get("smoker", ""))
    fh_score = float(patient_inputs_raw.get("family_history", 0.0))
    fh_rels  = list(patient_inputs_raw.get("family_history_relatives", []))
    rhc      = str(patient_inputs_raw.get("regular_health_checkup", ""))
    ped      = str(patient_inputs_raw.get("prostate_exam_done", ""))

    if feature == "physical_activity_level":
        if pal in ("low", "moderate"):
            return (
                f"Physical activity level '{pal.capitalize()}' — low physical activity "
                f"is linked to higher cancer risk. Regular exercise helps regulate "
                f"hormones including testosterone and insulin, reducing prostate cancer risk."
            )
        return (
            f"Physical activity level '{pal.capitalize()}' — high physical activity "
            f"is protective against cancer. Exercise helps regulate hormones including "
            f"testosterone and insulin, reducing prostate cancer risk."
        )

    if feature == "diet_type":
        if diet in ("fatty", "mixed"):
            return (
                f"Diet type '{diet.capitalize()}' — a fatty or unhealthy diet is associated "
                f"with higher prostate cancer risk. High fat intake, particularly saturated "
                f"fat, may stimulate prostate cancer cell growth."
            )
        return (
            f"Diet type '{diet.capitalize()}' — a healthy diet is associated with reduced "
            f"prostate cancer risk. A diet rich in fruits and vegetables and low in "
            f"saturated fat is protective against prostate cancer."
        )

    if feature == "alcohol_consumption":
        if alcohol == "no":
            return (
                "Alcohol consumption 'None' — not drinking alcohol is a protective factor. "
                "Heavy alcohol use has been linked to increased risk of various cancers, "
                "including prostate cancer."
            )
        if alcohol == "moderate":
            return (
                "Alcohol consumption 'Moderate' — moderate alcohol use carries some elevated "
                "risk. Heavy alcohol use has been linked to increased risk of various cancers, "
                "including prostate cancer."
            )
        return (
            "Alcohol consumption 'High' — high alcohol consumption is associated with "
            "elevated cancer risk. Heavy alcohol use has been linked to increased risk "
            "of various cancers, including prostate cancer."
        )

    if feature == "bmi":
        if bmi >= 25.0:
            return (
                f"Body Mass Index {bmi:.1f} ({bmi_cat}) — an elevated BMI indicates "
                f"overweight or obesity, which is linked to higher prostate cancer risk. "
                f"Excess adipose tissue can alter hormonal balance, particularly "
                f"estrogen and testosterone levels."
            )
        return (
            f"Body Mass Index {bmi:.1f} ({bmi_cat}) — a normal BMI is a protective "
            f"factor. Maintaining a healthy weight helps regulate hormonal balance, "
            f"reducing prostate cancer risk."
        )

    if feature == "bmi_category":
        if bmi_cat in ("Overweight", "Obese"):
            return (
                f"BMI classification '{bmi_cat}' — overweight or obese BMI is associated "
                f"with higher prostate cancer risk. Excess adipose tissue can alter "
                f"hormonal balance, particularly estrogen and testosterone levels."
            )
        return (
            f"BMI classification '{bmi_cat}' — a normal or underweight BMI is a "
            f"protective factor. Maintaining a healthy weight helps regulate hormonal "
            f"balance, reducing prostate cancer risk."
        )

    if feature == "age":
        if age >= 50:
            return (
                f"Age {int(age)} years ({age_grp}) — advanced age is one of the strongest "
                f"risk factors for prostate cancer. Men aged 50 and above face significantly "
                f"higher risk, with risk increasing further with each decade."
            )
        return (
            f"Age {int(age)} years ({age_grp}) — younger age is associated with lower "
            f"prostate cancer risk. However, regular monitoring is still recommended "
            f"as risk increases with age."
        )

    if feature == "age_group":
        if age_grp in ("50 to 59", "60 to 69", "70 and above"):
            return (
                f"Age group '{age_grp}' — this age group carries elevated prostate cancer "
                f"risk. Men aged 50 and above face significantly higher risk, with risk "
                f"increasing further with each decade."
            )
        return (
            f"Age group '{age_grp}' — this age group is at lower baseline risk. Regular "
            f"monitoring is still recommended as risk increases with age."
        )

    if feature == "risk_factor_count":
        if rfc >= 2:
            return (
                f"Primary risk factor count: {rfc} of 4 active. A higher count of active "
                f"primary risk factors significantly increases the overall probability of "
                f"prostate cancer."
            )
        return (
            f"Primary risk factor count: {rfc} of 4 active. A low count of active risk "
            f"factors is a protective indicator that reduces the overall probability of "
            f"prostate cancer."
        )

    if feature == "smoker":
        if smoker == "Yes":
            return (
                "Smoking status — patient is a smoker. Smoking is a known risk factor for "
                "several cancers. Tobacco use introduces carcinogens that can damage DNA "
                "and promote cancer cell growth."
            )
        return (
            "Smoking status — patient is a non-smoker. Not smoking is a protective factor "
            "that reduces exposure to tobacco carcinogens."
        )

    if feature == "family_history":
        if fh_score >= 0.35:
            fh_names = [FAMILY_HISTORY_RELATIVE_LABELS.get(r, r) for r in fh_rels]
            rel_str  = (", ".join(fh_names) + " ") if fh_names else ""
            return (
                f"Family history score {fh_score:.2f} / 1.00 ({rel_str.strip()}) — a "
                f"first-degree relative with prostate cancer significantly increases "
                f"hereditary risk due to shared genetic predisposition."
            )
        if fh_score > 0.0:
            return (
                f"Family history score {fh_score:.2f} / 1.00 — a second-degree relative "
                f"(grandfather) with prostate cancer mildly increases hereditary risk."
            )
        return (
            "Family history score 0.00 / 1.00 — no family history of prostate cancer "
            "reported. This is a protective indicator reducing hereditary risk."
        )

    if feature == "regular_health_checkup":
        if rhc == "No":
            return (
                "Regular health checkup attendance — not attending. Regular health checkups "
                "enable early detection and timely intervention, which is critical for "
                "improving cancer outcomes."
            )
        return (
            "Regular health checkup attendance — attending. Regular health checkups enable "
            "early detection and timely intervention, reducing the risk of late-stage diagnosis."
        )

    if feature == "prostate_exam_done":
        if ped == "No":
            return (
                "Prior prostate examination — none on record. A previous prostate examination "
                "provides baseline data and is important for early detection of prostate cancer."
            )
        return (
            "Prior prostate examination — on record. A previous prostate examination provides "
            "useful baseline data for ongoing monitoring."
        )

    return ""


def generate_clinical_explanation(
    patient_inputs_raw: dict,
    patient_encoded_values,
    predicted_label: str,
    probabilities,
    feature_names: list[str],
    model,
) -> dict:
    """Builds a plain-language clinical explanation from model outputs."""
    if hasattr(model, "feature_importances_"):
        importance_scores = model.feature_importances_
    else:
        importance_scores = np.abs(model.coef_).mean(axis=0)

    feature_display: dict[str, str] = {
        "age":
            f"Age ({patient_inputs_raw.get('age', 'N/A')} years)",
        "bmi":
            f"Body Mass Index — {patient_inputs_raw.get('bmi', 'N/A')}"
            f" ({patient_inputs_raw.get('bmi_category', '')})",
        "smoker":
            f"Smoking status ({patient_inputs_raw.get('smoker', 'N/A')})",
        "alcohol_consumption":
            f"Alcohol consumption ({patient_inputs_raw.get('alcohol_consumption', 'N/A')})",
        "diet_type":
            f"Diet type ({patient_inputs_raw.get('diet_type', 'N/A')})",
        "physical_activity_level":
            f"Physical activity level ({patient_inputs_raw.get('physical_activity_level', 'N/A')})",
        "family_history":
            f"Family history score ({float(patient_inputs_raw.get('family_history', 0.0)):.2f} / 1.00)",
        "regular_health_checkup":
            f"Regular health checkup attendance ({patient_inputs_raw.get('regular_health_checkup', 'N/A')})",
        "prostate_exam_done":
            f"Previous prostate examination ({patient_inputs_raw.get('prostate_exam_done', 'N/A')})",
        "bmi_category":
            f"BMI classification ({patient_inputs_raw.get('bmi_category', 'N/A')})",
        "age_group":
            f"Age group ({patient_inputs_raw.get('age_group', 'N/A')})",
        "risk_factor_count":
            f"Number of active risk factors"
            f" ({int(patient_inputs_raw.get('risk_factor_count', 0))} out of 4)",
    }

    imp_df = (
        pd.DataFrame({
            "feature":     feature_names,
            "importance":  importance_scores,
            "encoded_val": patient_encoded_values.flatten(),
        })
        .sort_values("importance", ascending=False)
    )

    top_factors: list[dict] = []
    for _, row in imp_df.head(5).iterrows():
        feat       = row["feature"]
        enc_val    = row["encoded_val"]
        importance = row["importance"]
        direction  = get_patient_factor_direction(feat, enc_val, predicted_label)
        strength   = (
            "Strong"   if importance > 0.12 else
            "Moderate" if importance > 0.06 else
            "Mild"
        )
        top_factors.append({
            "factor":        feature_display.get(feat, feat),
            "direction":     direction,
            "strength":      strength,
            "importance":    round(float(importance), 4),
            "clinical_note": get_clinical_note(feat, patient_inputs_raw),
        })

    top_factors = top_factors[:3]

    increasing        = [f["factor"] for f in top_factors if f["direction"] == "Increased risk"]
    decreasing        = [f["factor"] for f in top_factors if f["direction"] == "Decreased risk"]
    risk_factor_count = int(patient_inputs_raw.get("risk_factor_count", 0))

    if predicted_label == "High":
        why = (
            f"This patient was assessed as HIGH risk based on the combination of "
            f"clinical risk factors present. The patient has {risk_factor_count} out of 4 "
            f"primary risk factors active. "
        )
        if increasing:
            why += ("The most influential factors driving this HIGH risk prediction are: "
                    + "; ".join(increasing) + ". ")
        why += (
            "The model identified this pattern as consistent with a high-risk profile "
            "for prostate cancer, warranting immediate clinical action."
        )
    elif predicted_label == "Medium":
        why = (
            f"This patient was assessed as MEDIUM risk. Some clinical risk factors "
            f"are present ({risk_factor_count} out of 4 primary risk factors active) "
            f"that require monitoring and follow-up, but the combination does not "
            f"yet indicate an immediately high-risk profile. "
        )
        if increasing:
            why += ("The key factors elevating risk above Low include: "
                    + "; ".join(increasing) + ". ")
        if decreasing:
            why += ("Factors helping to moderate the risk include: "
                    + "; ".join(decreasing) + ".")
    else:
        why = (
            f"This patient was assessed as LOW risk. The patient has "
            f"{risk_factor_count} out of 4 primary risk factors active, "
            f"and the overall combination of clinical characteristics suggests "
            f"a low probability of prostate cancer at this time. "
        )
        if decreasing:
            why += ("Protective factors contributing to this LOW risk assessment include: "
                    + "; ".join(decreasing) + ".")

    fh_score    = float(patient_inputs_raw.get("family_history", 0.0))
    fh_rel_keys = list(patient_inputs_raw.get("family_history_relatives", []))
    smoker_val  = patient_inputs_raw.get("smoker", "No")
    rhc_val     = patient_inputs_raw.get("regular_health_checkup", "No")
    ped_val     = patient_inputs_raw.get("prostate_exam_done", "No")

    active_risk_factors: list[str] = []
    protective_factors:  list[str] = []

    if smoker_val == "Yes":
        active_risk_factors.append("Smoking (patient is a smoker)")
    else:
        protective_factors.append("Non-smoker")

    if fh_score >= 0.35:
        fh_names = [FAMILY_HISTORY_RELATIVE_LABELS.get(r, r) for r in fh_rel_keys]
        active_risk_factors.append(
            "Family history of prostate cancer (score "
            + f"{fh_score:.2f}/1.00"
            + (f" — {', '.join(fh_names)}" if fh_names else "")
            + ")"
        )
    else:
        protective_factors.append("No significant family history of prostate cancer")

    if rhc_val == "No":
        active_risk_factors.append("No regular health checkup attendance")
    else:
        protective_factors.append("Attends regular health checkups")

    if ped_val == "No":
        active_risk_factors.append("No prior prostate examination on record")
    else:
        protective_factors.append("Prior prostate examination on record")

    _summary_texts = {
        "High": (
            "The combination of these active risk factors alongside the patient's "
            "demographic and lifestyle profile produced a pattern consistent with "
            "high risk of prostate cancer. Immediate clinical action and referral are required."
        ),
        "Medium": (
            "The overall combination of clinical characteristics and lifestyle profile "
            "suggests a moderate probability of prostate cancer at this time. "
            "Follow-up consultation and monitoring are advised."
        ),
        "Low": (
            "The overall combination of the patient's clinical characteristics and "
            "lifestyle profile suggests a low probability of prostate cancer at this time. "
            "Routine monitoring is recommended."
        ),
    }
    summary_text = _summary_texts[predicted_label]

    pal_val     = str(patient_inputs_raw.get("physical_activity_level", "")).lower()
    diet_val    = str(patient_inputs_raw.get("diet_type", "")).lower()
    alcohol_val = str(patient_inputs_raw.get("alcohol_consumption", "")).lower()
    age_val     = float(patient_inputs_raw.get("age", 0))
    bmi_val     = float(patient_inputs_raw.get("bmi", 0))
    bmi_cat_val = str(patient_inputs_raw.get("bmi_category", ""))
    age_grp_val = str(patient_inputs_raw.get("age_group", ""))

    lifestyle_factor_notes = [
        {
            "feature":       "age",
            "label":         f"Age ({int(age_val)} years — {age_grp_val})",
            "direction":     "Increased risk" if age_val >= 50 else "Decreased risk",
            "clinical_note": get_clinical_note("age", patient_inputs_raw),
        },
        {
            "feature":       "bmi",
            "label":         f"Body Mass Index ({bmi_val:.1f} — {bmi_cat_val})",
            "direction":     "Increased risk" if bmi_val >= 25.0 else "Decreased risk",
            "clinical_note": get_clinical_note("bmi", patient_inputs_raw),
        },
        {
            "feature":       "physical_activity_level",
            "label":         f"Physical Activity Level ({pal_val.capitalize()})",
            "direction":     "Increased risk" if pal_val in ("low", "moderate") else "Decreased risk",
            "clinical_note": get_clinical_note("physical_activity_level", patient_inputs_raw),
        },
        {
            "feature":       "diet_type",
            "label":         f"Diet Type ({diet_val.capitalize()})",
            "direction":     "Increased risk" if diet_val in ("fatty", "mixed") else "Decreased risk",
            "clinical_note": get_clinical_note("diet_type", patient_inputs_raw),
        },
        {
            "feature":       "alcohol_consumption",
            "label":         f"Alcohol Consumption ({alcohol_val.capitalize()})",
            "direction":     "Increased risk" if alcohol_val in ("moderate", "high") else "Decreased risk",
            "clinical_note": get_clinical_note("alcohol_consumption", patient_inputs_raw),
        },
    ]

    return {
        "predicted_risk_level":    predicted_label,
        "confidence": {
            "Low":    f"{probabilities[0]:.1%}",
            "Medium": f"{probabilities[1]:.1%}",
            "High":   f"{probabilities[2]:.1%}",
        },
        "model_confidence":         f"{max(probabilities):.1%}",
        "risk_explanation":         summary_text,
        "active_risk_factors":      active_risk_factors,
        "inactive_risk_factors":    protective_factors,
        "protective_factors":       protective_factors,
        "summary_text":             summary_text,
        "top_contributing_factors": top_factors,
        "lifestyle_factor_notes":   lifestyle_factor_notes,
        "risk_factor_count":        risk_factor_count,
    }


# ── ClinicalProstatePredictor ─────────────────────────────────────────────────

class ClinicalProstatePredictor:
    """Self-contained clinical predictor bundled as a single .pkl file."""

    def __init__(self, model, scaler, encoders, feature_names,
                 risk_mapping, reverse_risk_mapping,
                 model_name, performance_summary, feature_importance_series):
        self.model                     = model
        self.scaler                    = scaler
        self.encoders                  = encoders
        self.feature_names             = feature_names
        self.risk_mapping              = risk_mapping
        self.reverse_risk_mapping      = reverse_risk_mapping
        self.model_name                = model_name
        self.performance_summary       = performance_summary
        self.feature_importance_series = feature_importance_series

    @staticmethod
    def _classify_bmi(v: float) -> str:
        if v < 18.5:   return "Underweight"
        elif v < 25.0: return "Normal"
        elif v < 30.0: return "Overweight"
        else:          return "Obese"

    @staticmethod
    def _classify_age(v: float) -> str:
        if v < 40:   return "Below 40"
        elif v < 50: return "Below 50"
        elif v < 60: return "50 to 59"
        elif v < 70: return "60 to 69"
        else:        return "70 and above"

    def _derive_engineered_features(self, patient_df: "pd.DataFrame") -> "pd.DataFrame":
        patient_df["bmi_category"] = patient_df["bmi"].apply(self._classify_bmi)
        patient_df["age_group"]    = patient_df["age"].apply(self._classify_age)
        patient_df["risk_factor_count"] = (
            (patient_df["smoker"]                 == "Yes").astype(int) +
            (patient_df["family_history"]         >= 0.35).astype(int) +
            (patient_df["regular_health_checkup"] == "No").astype(int) +
            (patient_df["prostate_exam_done"]     == "No").astype(int)
        )
        return patient_df

    def _encode_patient(self, patient_df: "pd.DataFrame") -> "pd.DataFrame":
        binary_cols  = ["smoker", "regular_health_checkup", "prostate_exam_done"]
        ordinal_cols = ["alcohol_consumption", "diet_type",
                        "physical_activity_level", "bmi_category", "age_group"]
        for col in binary_cols:
            patient_df[col] = self.encoders[col].transform(patient_df[col])
        for col in ordinal_cols:
            patient_df[col] = self.encoders[col].transform(patient_df[[col]])
        return patient_df

    def _compute_symptom_adjustment(
        self,
        symptom_dict: dict | None,
        base_risk_level: str,
    ) -> tuple:
        if not symptom_dict:
            return 0.0, [], [], "", False, base_risk_level

        symptom_score: float = 0.0
        symptoms_present: list = []
        urgent_flags: list = []

        for s in SYMPTOM_DEFINITIONS:
            status = str(symptom_dict.get(s["key"], "Absent")).strip()
            if status == "Present":
                symptom_score += s["weight"]
                symptoms_present.append(s["display"])
                if s["weight"] >= URGENT_SYMPTOM_THRESHOLD:
                    urgent_flags.append(s["display"])

        symptom_score = round(symptom_score, 4)
        final_risk    = base_risk_level
        applied       = False
        reason        = ""

        if symptom_score >= 0.60:
            final_risk = "High"
            applied    = True
            reason = (
                f"Symptom burden score {symptom_score:.2f} >= 0.60. One or more high-priority "
                f"symptoms present (e.g. haematuria, bone pain, leg weakness). Final risk "
                f"escalated to HIGH regardless of base model output. Urgent referral indicated."
            )
        elif symptom_score >= 0.40:
            if base_risk_level in ("Low", "Medium"):
                final_risk = "Medium"
                applied    = (base_risk_level == "Low")
                reason = (
                    f"Symptom burden score {symptom_score:.2f} (0.40-0.59). Multiple "
                    f"clinically significant symptoms recorded. Risk set to MEDIUM with urgent "
                    f"follow-up note. PSA testing and DRE recommended promptly."
                )
        elif symptom_score >= 0.20:
            if base_risk_level == "Low":
                final_risk = "Medium"
                applied    = True
                reason = (
                    f"Symptom burden score {symptom_score:.2f} (0.20-0.39). At least one "
                    f"clinically notable symptom present. Risk elevated from LOW to MEDIUM. "
                    f"Clinical review within 3 months advised."
                )

        return symptom_score, symptoms_present, urgent_flags, reason, applied, final_risk

    def _build_family_history_detail(self, fh_score: float, fh_relatives: list) -> dict:
        has_history   = fh_score > 0.0
        relative_names = [
            FAMILY_HISTORY_RELATIVE_LABELS.get(r, r) for r in fh_relatives
        ]

        if fh_score == 0.0:
            significance = (
                "No family history of prostate cancer reported. This is a protective "
                "indicator that reduces hereditary risk."
            )
        elif fh_score >= 0.70:
            significance = (
                "Multiple first-degree relatives affected. This significantly increases "
                "lifetime prostate cancer risk — approximately 2 to 3 times the general "
                "population risk."
            )
        elif fh_score >= 0.40:
            significance = (
                "A first-degree relative (father or brother) is affected. This moderately "
                "increases lifetime prostate cancer risk — approximately 2 times the general "
                "population risk."
            )
        else:
            significance = (
                "A second-degree relative (grandfather) is affected. This mildly increases "
                "prostate cancer risk compared to the general population."
            )

        return {
            "has_history":   has_history,
            "relatives":     relative_names,
            "score":         fh_score,
            "score_display": f"{fh_score:.2f} / 1.00",
            "significance":  significance,
        }

    def _build_recommendation(self, final_risk: str, adjustment_applied: bool,
                               symptoms_present: list) -> str:
        base = {
            "Low": (
                "No immediate referral required. Advise the patient to maintain a healthy "
                "lifestyle, attend annual health checkups, and return if any urinary symptoms "
                "develop (difficulty urinating, blood in urine, pelvic pain). Re-assess in 12 months."
            ),
            "Medium": (
                "Schedule a follow-up consultation within 3 months. If PSA testing is available "
                "at this or a nearby facility, consider ordering it. Counsel the patient on "
                "modifiable risk factors: diet, physical activity, alcohol use, and smoking "
                "cessation if applicable. Document and monitor."
            ),
            "High": (
                "REFER THIS PATIENT to a higher-level facility (Regional Hospital or Specialised "
                "Centre) within 1-2 weeks for further investigation including PSA testing and "
                "Digital Rectal Examination (DRE). Document the referral clearly in the patient's "
                "file. Follow up to confirm the patient attended the referral appointment. "
                "Do not delay — early referral saves lives."
            ),
        }
        recommendation = base.get(final_risk, base["Low"])

        if adjustment_applied and symptoms_present:
            symptom_str = "; ".join(symptoms_present[:3])
            if len(symptoms_present) > 3:
                symptom_str += f" (and {len(symptoms_present) - 3} more)"
            recommendation = (
                f"NOTE: Risk was elevated by symptom assessment. "
                f"Presenting symptoms: {symptom_str}. {recommendation}"
            )

        return recommendation

    def predict(self, patient_inputs: dict, symptom_dict: dict | None = None) -> dict:
        age = float(patient_inputs.get("age", 0))

        if age < 40:
            return {
                "eligible": False,
                "blocked_reason": (
                    "Patient is below the minimum eligible age for prostate cancer risk "
                    "screening (40 years). Prostate cancer is extremely rare before age 40. "
                    "No risk assessment is performed."
                ),
            }

        age_advisory       = None
        age_advisory_shown = False
        if 40 <= age < 45:
            age_advisory = (
                f"ADVISORY: Patient age {int(age)} years is between 40 and 44. Prostate "
                f"cancer risk is generally very low in this age bracket. This prediction "
                f"should be interpreted with caution and reviewed by a clinician before any "
                f"referral decision is made."
            )
            age_advisory_shown = True

        patient_df = pd.DataFrame([patient_inputs])
        raw_inputs = patient_inputs.copy()

        patient_df = self._derive_engineered_features(patient_df)
        raw_inputs["bmi_category"]      = patient_df["bmi_category"].iloc[0]
        raw_inputs["age_group"]         = patient_df["age_group"].iloc[0]
        raw_inputs["risk_factor_count"] = int(patient_df["risk_factor_count"].iloc[0])

        patient_df     = self._encode_patient(patient_df)
        patient_df     = patient_df[self.feature_names]
        patient_scaled = self.scaler.transform(patient_df)

        predicted_number = self.model.predict(patient_scaled)[0]
        predicted_label  = self.reverse_risk_mapping[predicted_number]
        probabilities    = self.model.predict_proba(patient_scaled)[0]

        clinical_output = generate_clinical_explanation(
            patient_inputs_raw     = raw_inputs,
            patient_encoded_values = patient_scaled,
            predicted_label        = predicted_label,
            probabilities          = probabilities,
            feature_names          = self.feature_names,
            model                  = self.model,
        )

        fh_score     = float(patient_inputs.get("family_history", 0.0))
        fh_relatives = list(patient_inputs.get("family_history_relatives", []))
        family_history_detail = self._build_family_history_detail(fh_score, fh_relatives)

        (
            symptom_score,
            symptoms_present,
            urgent_flags,
            adjustment_reason,
            adjustment_applied,
            final_risk_level,
        ) = self._compute_symptom_adjustment(symptom_dict, predicted_label)

        raw_symptom_dict: dict = {}
        for s in SYMPTOM_DEFINITIONS:
            if symptom_dict:
                status = str(symptom_dict.get(s["key"], "Not Documented")).strip()
                if status not in ("Present", "Absent", "Not Documented"):
                    status = "Not Documented"
            else:
                status = "Not Documented"
            raw_symptom_dict[s["key"]] = status

        symptom_adjustment = {
            "final_risk_level":     final_risk_level,
            "base_risk_level":      predicted_label,
            "adjustment_applied":   adjustment_applied,
            "adjustment_reason":    adjustment_reason,
            "symptom_score":        symptom_score,
            "symptoms_present":     symptoms_present,
            "urgent_symptom_flags": urgent_flags,
        }

        summary_text = clinical_output["summary_text"]
        if adjustment_applied and symptoms_present:
            symptom_str = ", ".join(symptoms_present[:3])
            if len(symptoms_present) > 3:
                symptom_str += f" and {len(symptoms_present) - 3} more"
            summary_text = (
                f"NOTE: The base model predicted {predicted_label.upper()} risk based on "
                f"clinical features. Presenting symptoms elevated the final risk to "
                f"{final_risk_level.upper()}. Symptoms driving this elevation: "
                f"{symptom_str}. {summary_text}"
            )

        recommendation = self._build_recommendation(
            final_risk_level, adjustment_applied, symptoms_present
        )

        return {
            "eligible":             True,
            "blocked_reason":       None,
            "age_advisory":         age_advisory,
            "age_advisory_shown":   age_advisory_shown,
            "predicted_risk_level": final_risk_level,
            "base_risk_level":      predicted_label,
            "final_risk_level":     final_risk_level,
            "confidence": {
                "Low":    f"{probabilities[0]:.1%}",
                "Medium": f"{probabilities[1]:.1%}",
                "High":   f"{probabilities[2]:.1%}",
            },
            "model_confidence":         f"{max(probabilities):.1%}",
            "risk_explanation":         clinical_output["risk_explanation"],
            "active_risk_factors":      clinical_output["active_risk_factors"],
            "inactive_risk_factors":    clinical_output["inactive_risk_factors"],
            "protective_factors":       clinical_output["protective_factors"],
            "summary_text":             summary_text,
            "top_contributing_factors": clinical_output["top_contributing_factors"],
            "lifestyle_factor_notes":   clinical_output["lifestyle_factor_notes"],
            "clinical_recommendation":  recommendation,
            "risk_factor_count":        clinical_output["risk_factor_count"],
            "family_history_detail":    family_history_detail,
            "symptom_adjustment":       symptom_adjustment,
            "raw_symptom_dict":         raw_symptom_dict,
            "probabilities_raw":        probabilities.tolist(),
            "patient_inputs_raw":       raw_inputs,
            "patient_encoded":          patient_scaled,
        }


# ── Register globals in __main__ before loading the pickle ───────────────────

_main = sys.modules["__main__"]
_main.ClinicalProstatePredictor     = ClinicalProstatePredictor       # type: ignore[attr-defined]
_main.generate_clinical_explanation = generate_clinical_explanation   # type: ignore[attr-defined]
_main.get_patient_factor_direction  = get_patient_factor_direction    # type: ignore[attr-defined]
_main.pd = pd                                                         # type: ignore[attr-defined]
_main.np = np                                                         # type: ignore[attr-defined]


# ── Load bundled predictor ─────────────────────────────────────────────────────

def _load(filename: str) -> Any:
    path = MODELS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Required model artefact not found: {path}\n"
            "Place prostate_cancer_predictor.pkl in model-service/models/."
        )
    return joblib.load(path)


predictor: ClinicalProstatePredictor = _load("prostate_cancer_predictor.pkl")

FEATURE_IMPORTANCES: dict[str, float] = {
    feat: round(float(score), 4)
    for feat, score in predictor.feature_importance_series
    .sort_values(ascending=False)
    .items()
}


# ── Family history score computation ─────────────────────────────────────────

def compute_family_history_score(relatives: list[str]) -> float:
    return round(
        sum(FAMILY_HISTORY_WEIGHTS.get(r.lower().strip(), 0.0) for r in relatives),
        4,
    )


# ── Alcohol normalisation ─────────────────────────────────────────────────────

_ALCOHOL_MAP: dict[str, str] = {"no": "No", "moderate": "Moderate", "high": "High"}


# ── Public predict function ───────────────────────────────────────────────────

def predict(
    age: float,
    bmi: float,
    smoker: bool,
    diet_type: str,
    physical_activity_level: str,
    family_history_score: float,
    family_history_relatives: list,
    regular_health_checkup: bool,
    prostate_exam_done: bool,
    alcohol_consumption: str,
    symptom_dict: dict | None = None,
) -> dict:
    alcohol_key = alcohol_consumption.lower().strip()
    if alcohol_key not in _ALCOHOL_MAP:
        raise ValueError(
            f"Invalid alcohol_consumption '{alcohol_consumption}'. "
            "Must be one of: no | moderate | high."
        )

    patient_inputs = {
        "age":                      age,
        "bmi":                      bmi,
        "smoker":                   "Yes" if smoker else "No",
        "diet_type":                diet_type.capitalize(),
        "physical_activity_level":  physical_activity_level.capitalize(),
        "family_history":           family_history_score,
        "family_history_relatives": [r.lower().strip() for r in family_history_relatives],
        "regular_health_checkup":   "Yes" if regular_health_checkup else "No",
        "prostate_exam_done":       "Yes" if prostate_exam_done else "No",
        "alcohol_consumption":      _ALCOHOL_MAP[alcohol_key],
    }

    result = predictor.predict(patient_inputs, symptom_dict)

    if not result.get("eligible", True):
        return {
            "eligible":       False,
            "blocked_reason": result["blocked_reason"],
        }

    probs            = result["probabilities_raw"]
    confidence_str   = result["model_confidence"]
    confidence_float = float(confidence_str.rstrip("%"))

    return {
        "eligible":               True,
        "blocked_reason":         None,
        "age_advisory":           result.get("age_advisory"),
        "age_advisory_shown":     result.get("age_advisory_shown", False),
        "risk_level":             result["predicted_risk_level"],
        "base_risk_level":        result["base_risk_level"],
        "final_risk_level":       result["final_risk_level"],
        "low_percentage":         round(probs[0] * 100, 2),
        "medium_percentage":      round(probs[1] * 100, 2),
        "high_percentage":        round(probs[2] * 100, 2),
        "model_confidence":       confidence_float,
        "risk_explanation":       result["risk_explanation"],
        "active_risk_factors":    result["active_risk_factors"],
        "inactive_risk_factors":  result["inactive_risk_factors"],
        "protective_factors":     result["protective_factors"],
        "summary_text":           result["summary_text"],
        "top_contributing_factors": result["top_contributing_factors"],
        "lifestyle_factor_notes": result["lifestyle_factor_notes"],
        "clinical_recommendation": result["clinical_recommendation"],
        "risk_factor_count":      result["risk_factor_count"],
        "feature_importances":    FEATURE_IMPORTANCES,
        "family_history_detail":  result["family_history_detail"],
        "symptom_adjustment":     result["symptom_adjustment"],
        "raw_symptom_dict":       result["raw_symptom_dict"],
    }
