"""
main.py — FastAPI application for the ProxaScreen model service.

Endpoints:
  GET  /health   → liveness check
  POST /predict  → prostate cancer risk prediction
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("model-service")


# ── Lifespan: validate model artefacts are loadable before accepting traffic ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    # model.py loads artefacts at import time; any FileNotFoundError raised
    # during import will propagate here and prevent the server from starting.
    try:
        import model  # noqa: F401 — triggers the module-level loads
        logger.info("Model artefacts loaded successfully.")
    except FileNotFoundError as exc:
        logger.error("Startup failed — missing model artefact: %s", exc)
        raise
    yield


app = FastAPI(
    title="ProxaScreen Model Service",
    description="Prostate cancer risk prediction API",
    version="1.0.0",
    lifespan=lifespan,
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    age:                    float = Field(..., gt=0, le=120, description="Patient age in years")
    bmi:                    float = Field(..., gt=0, description="Body mass index")
    smoker:                 bool  = Field(..., description="Current or former smoker")
    diet_type:              str   = Field(..., description="fatty | mixed | healthy")
    physical_activity_level: str  = Field(..., description="low | moderate | high")
    family_history:         bool  = Field(..., description="Family history of prostate cancer")
    regular_health_checkup: bool  = Field(..., description="Attends regular health checkups")
    prostate_exam_done:     bool  = Field(..., description="Has had a prostate exam")

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


class PredictResponse(BaseModel):
    risk_level:        str   = Field(..., description="Low | Medium | High")
    low_percentage:    float = Field(..., description="Probability of Low risk (0–100)")
    medium_percentage: float = Field(..., description="Probability of Medium risk (0–100)")
    high_percentage:   float = Field(..., description="Probability of High risk (0–100)")


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
    Run the prostate cancer risk model and return risk level with class probabilities.
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
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        logger.exception("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed — see model service logs.",
        )

    return PredictResponse(
        risk_level        = result.risk_level,
        low_percentage    = result.low_percentage,
        medium_percentage = result.medium_percentage,
        high_percentage   = result.high_percentage,
    )
