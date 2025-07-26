FROM python:3.13.5-alpine

WORKDIR /app

COPY requirements.txt .
COPY main.py .

RUN pip install -r requirements.txt
RUN apk add ffmpeg=6.1.2-r2

EXPOSE 44777

CMD ["gunicorn", "--bind=0.0.0.0:44777", "--workers=12", "main:app"]

# docker build -t chuuni-keys-server .
# docker run -d --rm -p 44777:44777 -v chuuni_volume:/chuuni_volume chuuni-keys-server 