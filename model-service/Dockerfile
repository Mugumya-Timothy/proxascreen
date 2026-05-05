FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py model.py ./

# Download the model from GitHub Releases at build time
ARG MODEL_URL=https://github.com/Mugumya-Timothy/proxascreen/releases/download/v1.0.2/prostate_cancer_predictor.pkl
RUN mkdir -p models && \
    apt-get update && apt-get install -y --no-install-recommends wget && \
    wget -O models/prostate_cancer_predictor.pkl "$MODEL_URL" && \
    apt-get purge -y wget && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]