"""
model.py — loads all artefacts from models/ at startup and exposes a
single predict() function consumed by main.py.

Expected files in models/:
  prostate_cancer_model.pkl — trained scikit-learn classifier (predict_proba support required)
  scaler.pkl                — fitted StandardScaler (or similar) for numeric features
  label_encoders.pkl        — fitted LabelEncoder for the target classes (Low / Medium / High)
  feature_cols.pkl          — Python list of feature names in the exact order the model expects
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────

MODELS_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).parent / "models"))

# ── Load artefacts at module import (once, at startup) ────────────────────────

def _load(filename: str) -> Any:
    path = MODELS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Required model artefact not found: {path}\n"
            "Place the trained .pkl files in the model-service/models/ directory."
        )
    return joblib.load(path)


model          = _load("prostate_cancer_model.pkl")
scaler         = _load("scaler.pkl")
_encoders: dict = _load("label_encoders.pkl")
feature_names: list[str] = _load("feature_cols.pkl")

# Ordered class list derived from risk_level_reverse {0: 'Low', 1: 'Medium', 2: 'High'}
_risk_reverse: dict[int, str] = _encoders["risk_level_reverse"]
_CLASSES: list[str] = [_risk_reverse[i] for i in sorted(_risk_reverse)]

# ── Preprocessing ─────────────────────────────────────────────────────────────

# Ordinal mappings matching the OrdinalEncoder used during training.
# OrdinalEncoder categories: Fatty=0, Mixed=1, Healthy=2 and Low=0, Moderate=1, High=2
_DIET_ORDINAL     = {"fatty": 0, "mixed": 1, "healthy": 2}
_ACTIVITY_ORDINAL = {"low": 0, "moderate": 1, "high": 2}


def _build_feature_row(
    age: float,
    bmi: float,
    smoker: bool,
    diet_type: str,
    physical_activity_level: str,
    family_history: bool,
    regular_health_checkup: bool,
    prostate_exam_done: bool,
) -> pd.DataFrame:
    """
    Build a single-row DataFrame with the exact columns the model was trained on.

    Strategy:
      1. Start with the raw numeric / boolean values.
      2. One-hot encode diet_type and physical_activity_level (drop_first=False so
         every category gets its own column, matching typical sklearn pipelines).
      3. Reindex to feature_names so missing columns become 0 and column order matches
         what the scaler/model saw during training.
    """
    # Boolean fields: LabelEncoder was trained on 'Yes'/'No' strings.
    # LabelEncoder classes are ['No', 'Yes'] so No=0, Yes=1.
    def _bool_encode(v: bool) -> int:
        return 1 if v else 0

    raw: dict[str, Any] = {
        "age":                    age,
        "bmi":                    bmi,
        "smoker":                 _bool_encode(smoker),
        "diet_type":              _DIET_ORDINAL[diet_type.lower()],
        "physical_activity_level": _ACTIVITY_ORDINAL[physical_activity_level.lower()],
        "family_history":         _bool_encode(family_history),
        "regular_health_checkup": _bool_encode(regular_health_checkup),
        "prostate_exam_done":     _bool_encode(prostate_exam_done),
    }

    df = pd.DataFrame([raw])

    # Align to the training feature set — fills missing columns with 0,
    # drops any extra columns, and enforces the original column order.
    df = df.reindex(columns=feature_names, fill_value=0)

    return df


# ── Public predict function ───────────────────────────────────────────────────

class PredictionResult:
    __slots__ = ("risk_level", "low_percentage", "medium_percentage", "high_percentage")

    def __init__(
        self,
        risk_level: str,
        low_percentage: float,
        medium_percentage: float,
        high_percentage: float,
    ) -> None:
        self.risk_level       = risk_level
        self.low_percentage   = low_percentage
        self.medium_percentage = medium_percentage
        self.high_percentage  = high_percentage


def predict(
    age: float,
    bmi: float,
    smoker: bool,
    diet_type: str,
    physical_activity_level: str,
    family_history: bool,
    regular_health_checkup: bool,
    prostate_exam_done: bool,
) -> PredictionResult:
    """
    Preprocess inputs, run the model, and return a PredictionResult.

    Raises:
        ValueError: if diet_type or physical_activity_level are invalid.
    """
    diet_type               = diet_type.lower().strip()
    physical_activity_level = physical_activity_level.lower().strip()

    if diet_type not in _DIET_ORDINAL:
        raise ValueError(f"Invalid diet_type '{diet_type}'. Must be one of {list(_DIET_ORDINAL)}.")
    if physical_activity_level not in _ACTIVITY_ORDINAL:
        raise ValueError(
            f"Invalid physical_activity_level '{physical_activity_level}'. "
            f"Must be one of {list(_ACTIVITY_ORDINAL)}."
        )

    # Build feature DataFrame and scale numeric columns.
    df = _build_feature_row(
        age=age,
        bmi=bmi,
        smoker=smoker,
        diet_type=diet_type,
        physical_activity_level=physical_activity_level,
        family_history=family_history,
        regular_health_checkup=regular_health_checkup,
        prostate_exam_done=prostate_exam_done,
    )

    X_scaled = scaler.transform(df)

    # Get class probabilities.
    probas: np.ndarray = model.predict_proba(X_scaled)[0]  # shape: (n_classes,)

    # Map probabilities to named classes via the risk_level_reverse mapping.
    proba_map: dict[str, float] = {
        cls: float(round(prob * 100, 2))
        for cls, prob in zip(_CLASSES, probas)
    }

    # Determine the predicted class (argmax).
    predicted_idx   = int(np.argmax(probas))
    predicted_class = _CLASSES[predicted_idx]

    return PredictionResult(
        risk_level        = predicted_class,
        low_percentage    = proba_map.get("Low",    0.0),
        medium_percentage = proba_map.get("Medium", 0.0),
        high_percentage   = proba_map.get("High",   0.0),
    )
