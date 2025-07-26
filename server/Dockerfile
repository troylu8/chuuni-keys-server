FROM python:3.13.5-alpine

WORKDIR /app

RUN mkdir -p /app/static/charts/
COPY requirements.txt .
COPY server.py .

RUN pip install -r requirements.txt
RUN apk add ffmpeg=6.1.2-r2

EXPOSE 44777

CMD ["gunicorn", "--bind=0.0.0.0:44777", "--workers=12", "server:app"]