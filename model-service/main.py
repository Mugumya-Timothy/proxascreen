"""
main.py — FastAPI application for the ProxaScreen model service.

Endpoints:
  GET  /health   → liveness check
  POST /predict  → prostate cancer risk prediction with full clinical output
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("model-service")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        import model  # noqa: F401 — triggers module-level load and validation
        logger.info("Model artefacts loaded successfully.")
    except FileNotFoundError as exc:
        logger.error("Startup failed — missing model artefact: %s", exc)
        raise
    yield


app = FastAPI(
    title="ProxaScreen Model Service",
    description="Prostate cancer risk prediction API",
    version="3.0.0",
    lifespan=lifespan,
)


# ── Request schema ─────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    age:                      float             = Field(..., gt=0, le=120)
    bmi:                      float             = Field(..., gt=0)
    smoker:                   bool
    diet_type:                str               = Field(..., description="fatty | mixed | healthy")
    physical_activity_level:  str               = Field(..., description="low | moderate | high")
    family_history_score:     float             = Field(..., ge=0.0, le=1.0,
                                                        description="Weighted relative score 0.0-1.0")
    family_history_relatives: list[str]         = Field(default_factory=list,
                                                        description="List of relative keys")
    regular_health_checkup:   bool
    prostate_exam_done:       bool
    alcohol_consumption:      str               = Field(..., description="no | moderate | high")
    symptom_dict:             Optional[dict[str, str]] = Field(
                                  default=None,
                                  description="Map of symptom key → Present | Absent | Not Documented")

    @field_validator("diet_type")
    @classmethod
    def validate_diet_type(cls, v: str) -> str:
        allowed = {"fatty", "mixed", "healthy"}
        if v.lower().strip() not in allowed:
            raise ValueError(f"diet_type must be one of {sorted(allowed)}")
        return v.lower().strip()

    @field_validator("physical_activity_level")
    @classmethod
    def validate_activity(cls, v: str) -> str:
        allowed = {"low", "moderate", "high"}
        if v.lower().strip() not in allowed:
            raise ValueError(f"physical_activity_level must be one of {sorted(allowed)}")
        return v.lower().strip()

    @field_validator("alcohol_consumption")
    @classmethod
    def validate_alcohol(cls, v: str) -> str:
        allowed = {"no", "moderate", "high"}
        if v.lower().strip() not in allowed:
            raise ValueError(f"alcohol_consumption must be one of {sorted(allowed)}")
        return v.lower().strip()


# ── Nested response models ────────────────────────────────────────────────────

class ContributingFactor(BaseModel):
    factor:        str
    direction:     str
    strength:      str
    importance:    float
    clinical_note: str


class LifestyleFactorNote(BaseModel):
    feature:       str
    label:         str
    direction:     str
    clinical_note: str


class FamilyHistoryDetail(BaseModel):
    has_history:   bool
    relatives:     list[str]
    score:         float
    score_display: str
    significance:  str


class SymptomAdjustment(BaseModel):
    final_risk_level:     str
    base_risk_level:      str
    adjustment_applied:   bool
    adjustment_reason:    str
    symptom_score:        float
    symptoms_present:     list[str]
    urgent_symptom_flags: list[str]


# ── Response schema ────────────────────────────────────────────────────────────

class PredictResponse(BaseModel):
    # Eligibility
    eligible:           bool
    blocked_reason:     Optional[str]             = None
    age_advisory:       Optional[str]             = None
    age_advisory_shown: bool                      = False

    # Risk levels — only present when eligible=True
    risk_level:         Optional[str]             = None   # final adjusted
    base_risk_level:    Optional[str]             = None
    final_risk_level:   Optional[str]             = None

    # Probabilities (always BASE model, never adjusted)
    low_percentage:     Optional[float]           = None
    medium_percentage:  Optional[float]           = None
    high_percentage:    Optional[float]           = None
    model_confidence:   Optional[float]           = None

    # Explanation
    risk_explanation:          Optional[str]                = None
    active_risk_factors:       Optional[list[str]]          = None
    inactive_risk_factors:     Optional[list[str]]          = None
    protective_factors:        Optional[list[str]]          = None
    summary_text:              Optional[str]                = None
    top_contributing_factors:  Optional[list[ContributingFactor]] = None
    lifestyle_factor_notes:    Optional[list[LifestyleFactorNote]] = None
    clinical_recommendation:   Optional[str]               = None
    risk_factor_count:         Optional[int]               = None
    feature_importances:       Optional[dict[str, float]]  = None

    # New detail blocks
    family_history_detail:     Optional[FamilyHistoryDetail]  = None
    symptom_adjustment:        Optional[SymptomAdjustment]    = None
    raw_symptom_dict:          Optional[dict[str, str]]       = None


class HealthResponse(BaseModel):
    status: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
    tags=["meta"],
)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict prostate cancer risk",
    status_code=status.HTTP_200_OK,
    tags=["prediction"],
)
def predict(req: PredictRequest) -> PredictResponse:
    """
    Run the prostate cancer risk model and return the full clinical result.

    When eligible=False (age < 40) only blocked_reason is populated.
    Probability bars always show BASE model probabilities.
    risk_level always reflects the SYMPTOM-ADJUSTED final risk.
    """
    import model as m

    try:
        result = m.predict(
            age                      = req.age,
            bmi                      = req.bmi,
            smoker                   = req.smoker,
            diet_type                = req.diet_type,
            physical_activity_level  = req.physical_activity_level,
            family_history_score     = req.family_history_score,
            family_history_relatives = req.family_history_relatives,
            regular_health_checkup   = req.regular_health_checkup,
            prostate_exam_done       = req.prostate_exam_done,
            alcohol_consumption      = req.alcohol_consumption,
            symptom_dict             = req.symptom_dict,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        logger.exception("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed — see model service logs.",
        )

    return PredictResponse(**result)
