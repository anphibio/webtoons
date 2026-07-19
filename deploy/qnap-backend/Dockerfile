FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/home/app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends libgomp1 libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

WORKDIR /opt/webtoon-api

COPY apps/api/requirements.txt apps/api/requirements-ocr.txt ./
RUN python -m pip install --upgrade pip \
    && python -m pip install --requirement requirements-ocr.txt

COPY --chown=app:app apps/api/app ./app

RUN mkdir -p /home/app/.paddlex \
    && chown -R app:app /home/app/.paddlex /opt/webtoon-api

USER app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
