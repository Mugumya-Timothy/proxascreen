FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer-cached until requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py model.py ./

# Download model artefacts from GitHub Releases
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p ./models \
    && curl -fsSL -o ./models/feature_cols.pkl        https://github.com/Mugumya-Timothy/proxascreen/releases/download/v1.0.0-models/feature_cols.pkl \
    && curl -fsSL -o ./models/label_encoders.pkl      https://github.com/Mugumya-Timothy/proxascreen/releases/download/v1.0.0-models/label_encoders.pkl \
    && curl -fsSL -o ./models/prostate_cancer_model.pkl https://github.com/Mugumya-Timothy/proxascreen/releases/download/v1.0.0-models/prostate_cancer_model.pkl \
    && curl -fsSL -o ./models/scaler.pkl              https://github.com/Mugumya-Timothy/proxascreen/releases/download/v1.0.0-models/scaler.pkl

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
