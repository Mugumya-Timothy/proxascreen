"""
model.py — loads the bundled ClinicalProstatePredictor from
prostate_cancer_predictor.pkl and exposes a predict() function consumed
by main.py.

The single .pkl file bundles: trained model, scaler, encoders, feature
names, reverse risk mapping, and a predict() method that returns full
clinical output (explanation, contributing factors, recommendation).
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


# ── Module-level functions required by the pickled predict() method ───────────
#
# ClinicalProstatePredictor.predict() was defined in a Jupyter notebook
# (__main__) and calls generate_clinical_explanation and
# get_patient_factor_direction as globals.  We define them here, then
# register them in sys.modules['__main__'] BEFORE loading the .pkl so
# that pickle can resolve these names at call time.

def get_patient_factor_direction(feature_name: str,
                                  encoded_value: float,
                                  predicted_label: str) -> str:
    """
    Returns 'Increased risk' or 'Decreased risk' for a feature value.
    Based on the clinical encoding ordering defined during training:
      - 'high' direction: higher encoded value = more risk
      - 'low'  direction: lower  encoded value = more risk
    """
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
    elif direction == "high":
        increases_risk = encoded_value >= 1
    else:
        increases_risk = encoded_value <= 0

    return "Increased risk" if increases_risk else "Decreased risk"


def generate_clinical_explanation(
    patient_inputs_raw: dict,
    patient_encoded_values,
    predicted_label: str,
    probabilities,
    feature_names: list[str],
    model,
) -> dict:
    """
    Builds a plain-language clinical explanation from model outputs.
    Works for any model type (no SHAP dependency).
    """
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
            f"Family history of prostate cancer ({patient_inputs_raw.get('family_history', 'N/A')})",
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
            "feature":    feature_names,
            "importance": importance_scores,
            "encoded_val": patient_encoded_values.flatten(),
        })
        .sort_values("importance", ascending=False)
    )

    top_factors: list[dict] = []
    for _, row in imp_df.head(5).iterrows():
        feat        = row["feature"]
        enc_val     = row["encoded_val"]
        importance  = row["importance"]
        direction   = get_patient_factor_direction(feat, enc_val, predicted_label)
        strength    = (
            "Strong"   if importance > 0.12 else
            "Moderate" if importance > 0.06 else
            "Mild"
        )
        top_factors.append({
            "factor":     feature_display.get(feat, feat),
            "direction":  direction,
            "strength":   strength,
            "importance": round(float(importance), 4),
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

    recommendations = {
        "Low": (
            "No immediate referral required. Advise the patient to maintain a "
            "healthy lifestyle, attend annual health checkups, and return if any "
            "urinary symptoms develop (difficulty urinating, blood in urine, pelvic "
            "pain). Re-assess in 12 months."
        ),
        "Medium": (
            "Schedule a follow-up consultation within 3 months. If PSA testing is "
            "available at this or a nearby facility, consider ordering it. Counsel "
            "the patient on modifiable risk factors: diet, physical activity, alcohol "
            "use, and smoking cessation if applicable. Document and monitor."
        ),
        "High": (
            "REFER THIS PATIENT to a higher-level facility (Regional Hospital or "
            "Specialised Centre) within 1-2 weeks for further investigation including "
            "PSA testing and Digital Rectal Examination (DRE). Document the referral "
            "clearly in the patient's file. Follow up to confirm the patient attended "
            "the referral appointment. Do not delay — early referral saves lives."
        ),
    }

    return {
        "predicted_risk_level": predicted_label,
        "confidence": {
            "Low":    f"{probabilities[0]:.1%}",
            "Medium": f"{probabilities[1]:.1%}",
            "High":   f"{probabilities[2]:.1%}",
        },
        "model_confidence":          f"{max(probabilities):.1%}",
        "risk_explanation":          why,
        "top_contributing_factors":  top_factors,
        "clinical_recommendation":   recommendations[predicted_label],
        "risk_factor_count":         risk_factor_count,
    }


# ── ClinicalProstatePredictor ─────────────────────────────────────────────────
# Defined here so joblib can resolve the class when unpickling.
# The definition must exactly match the one used in the notebook.

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

    def _derive_engineered_features(self, patient_df: "pd.DataFrame") -> "pd.DataFrame":
        def classify_bmi(v: float) -> str:
            if v < 18.5:   return "Underweight"
            elif v < 25.0: return "Normal"
            elif v < 30.0: return "Overweight"
            else:          return "Obese"

        def classify_age(v: float) -> str:
            if v < 50:   return "Below 50"
            elif v < 60: return "50 to 59"
            elif v < 70: return "60 to 69"
            else:        return "70 and above"

        patient_df["bmi_category"] = patient_df["bmi"].apply(classify_bmi)
        patient_df["age_group"]    = patient_df["age"].apply(classify_age)
        patient_df["risk_factor_count"] = (
            (patient_df["smoker"]                 == "Yes").astype(int) +
            (patient_df["family_history"]         == "Yes").astype(int) +
            (patient_df["regular_health_checkup"] == "No").astype(int)  +
            (patient_df["prostate_exam_done"]     == "No").astype(int)
        )
        return patient_df

    def _encode_patient(self, patient_df: "pd.DataFrame") -> "pd.DataFrame":
        binary_cols  = ["smoker", "family_history",
                        "regular_health_checkup", "prostate_exam_done"]
        ordinal_cols = ["alcohol_consumption", "diet_type",
                        "physical_activity_level", "bmi_category", "age_group"]
        for col in binary_cols:
            patient_df[col] = self.encoders[col].transform(patient_df[col])
        for col in ordinal_cols:
            patient_df[col] = self.encoders[col].transform(patient_df[[col]])
        return patient_df

    def predict(self, patient_inputs: dict) -> dict:
        patient_df = pd.DataFrame([patient_inputs])
        raw_inputs = patient_inputs.copy()

        patient_df = self._derive_engineered_features(patient_df)
        raw_inputs["bmi_category"]      = patient_df["bmi_category"].iloc[0]
        raw_inputs["age_group"]         = patient_df["age_group"].iloc[0]
        raw_inputs["risk_factor_count"] = patient_df["risk_factor_count"].iloc[0]

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
        clinical_output["probabilities_raw"]  = probabilities.tolist()
        clinical_output["patient_inputs_raw"] = raw_inputs
        clinical_output["patient_encoded"]    = patient_scaled
        return clinical_output


# ── Register globals in __main__ before loading the pickle ───────────────────
# pickle resolves the class + helper functions from __main__ at unpickle time.

_main = sys.modules["__main__"]
_main.ClinicalProstatePredictor    = ClinicalProstatePredictor       # type: ignore[attr-defined]
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

# Feature importance data for the frontend chart, sorted descending.
FEATURE_IMPORTANCES: dict[str, float] = {
    feat: round(float(score), 4)
    for feat, score in predictor.feature_importance_series
    .sort_values(ascending=False)
    .items()
}


# ── Alcohol consumption normalisation map ─────────────────────────────────────

_ALCOHOL_MAP: dict[str, str] = {"no": "No", "moderate": "Moderate", "high": "High"}


# ── Public predict function ───────────────────────────────────────────────────

def predict(
    age: float,
    bmi: float,
    smoker: bool,
    diet_type: str,
    physical_activity_level: str,
    family_history: bool,
    regular_health_checkup: bool,
    prostate_exam_done: bool,
    alcohol_consumption: str,
) -> dict:
    """
    Normalise inputs, run the bundled predictor, and return a dict with full
    clinical output ready to be serialised into the API response.

    Boolean fields are converted to 'Yes'/'No' strings (LabelEncoder format).
    Categorical fields are title-cased to match OrdinalEncoder categories.
    """
    alcohol_key = alcohol_consumption.lower().strip()
    if alcohol_key not in _ALCOHOL_MAP:
        raise ValueError(
            f"Invalid alcohol_consumption '{alcohol_consumption}'. "
            "Must be one of: no | moderate | high."
        )

    patient_inputs = {
        "age":                     age,
        "bmi":                     bmi,
        "smoker":                  "Yes" if smoker else "No",
        "diet_type":               diet_type.capitalize(),
        "physical_activity_level": physical_activity_level.capitalize(),
        "family_history":          "Yes" if family_history else "No",
        "regular_health_checkup":  "Yes" if regular_health_checkup else "No",
        "prostate_exam_done":      "Yes" if prostate_exam_done else "No",
        "alcohol_consumption":     _ALCOHOL_MAP[alcohol_key],
    }

    result = predictor.predict(patient_inputs)

    probs            = result["probabilities_raw"]   # [P_Low, P_Medium, P_High]
    confidence_str   = result["model_confidence"]    # e.g. "99.7%"
    confidence_float = float(confidence_str.rstrip("%"))

    return {
        "risk_level":               result["predicted_risk_level"],
        "low_percentage":           round(probs[0] * 100, 2),
        "medium_percentage":        round(probs[1] * 100, 2),
        "high_percentage":          round(probs[2] * 100, 2),
        "model_confidence":         confidence_float,
        "risk_explanation":         result["risk_explanation"],
        "top_contributing_factors": result["top_contributing_factors"],
        "clinical_recommendation":  result["clinical_recommendation"],
        "feature_importances":      FEATURE_IMPORTANCES,
    }
