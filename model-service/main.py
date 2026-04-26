"""
main.py — FastAPI application for the ProxaScreen model service.

Endpoints:
  GET  /health   → liveness check
  POST /predict  → prostate cancer risk prediction with full clinical output
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

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
    version="2.0.0",
    lifespan=lifespan,
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    age:                     float = Field(..., gt=0, le=120, description="Patient age in years")
    bmi:                     float = Field(..., gt=0, description="Body mass index")
    smoker:                  bool  = Field(..., description="Current or former smoker")
    diet_type:               str   = Field(..., description="fatty | mixed | healthy")
    physical_activity_level: str   = Field(..., description="low | moderate | high")
    family_history:          bool  = Field(..., description="Family history of prostate cancer")
    regular_health_checkup:  bool  = Field(..., description="Attends regular health checkups")
    prostate_exam_done:      bool  = Field(..., description="Has had a prostate exam")
    alcohol_consumption:     str   = Field(..., description="no | moderate | high")

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


class ContributingFactor(BaseModel):
    factor:       str
    direction:    str
    strength:     str
    importance:   float
    clinical_note: str


class LifestyleFactorNote(BaseModel):
    feature:       str
    label:         str
    direction:     str
    clinical_note: str


class PredictResponse(BaseModel):
    risk_level:               str                    = Field(..., description="Low | Medium | High")
    low_percentage:           float                  = Field(..., description="Probability of Low risk (0–100)")
    medium_percentage:        float                  = Field(..., description="Probability of Medium risk (0–100)")
    high_percentage:          float                  = Field(..., description="Probability of High risk (0–100)")
    model_confidence:         float                  = Field(..., description="Model confidence percentage (0–100)")
    risk_explanation:         str                    = Field(..., description="Closing summary paragraph (backwards compat)")
    active_risk_factors:      list[str]              = Field(..., description="Active primary risk factors")
    protective_factors:       list[str]              = Field(..., description="Inactive/protective primary risk factors")
    summary_text:             str                    = Field(..., description="Closing summary paragraph")
    top_contributing_factors: list[ContributingFactor]
    lifestyle_factor_notes:   list[LifestyleFactorNote] = Field(..., description="Clinical notes for all lifestyle factors")
    clinical_recommendation:  str                    = Field(..., description="Clinical next-action recommendation")
    feature_importances:      dict[str, float]       = Field(..., description="Feature importance scores for chart")


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
    Run the prostate cancer risk model and return risk level, probabilities,
    model confidence, assessment summary, contributing factors,
    clinical recommendation, and feature importances for charting.
    """
    import model as m

    try:
        result = m.predict(
            age                    = req.age,
            bmi                    = req.bmi,
            smoker                 = req.smoker,
            diet_type              = req.diet_type,
            physical_activity_level= req.physical_activity_level,
            family_history         = req.family_history,
            regular_health_checkup = req.regular_health_checkup,
            prostate_exam_done     = req.prostate_exam_done,
            alcohol_consumption    = req.alcohol_consumption,
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
