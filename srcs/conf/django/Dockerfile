FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y \
	inetutils-ping \
    build-essential \
    libpq-dev \
	libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt
RUN pip install bleach
RUN pip install python-magic

RUN pip list
RUN pip install web3

RUN mkdir -p media/avatars
RUN mkdir -p media/badges/

COPY default.png media/avatars/
COPY Badge_*.png media/badges/


COPY . /app
WORKDIR /app

EXPOSE 8000

CMD 