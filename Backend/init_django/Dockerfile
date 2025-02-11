FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y \
	inetutils-ping \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

RUN pip list

RUN mkdir -p media/avatars

COPY default.png media/avatars/

COPY . /app
WORKDIR /app

EXPOSE 8000

CMD 