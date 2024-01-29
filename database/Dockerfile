FROM postgres:16

# Update and install dependencies
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      locales \
      ca-certificates \
      build-essential \
      postgresql-server-dev-all \
      libicu-dev \
      libpam0g-dev \
      zlib1g-dev \
      git \
      curl

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    update-locale LANG=en_US.UTF-8

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Install pg_vector
RUN cd /tmp && \
    git clone https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make && \
    make install && \
    rm -rf /tmp/pgvector

RUN echo 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' >> /docker-entrypoint-initdb.d/00-uuid-ossp.sql
RUN echo 'CREATE EXTENSION IF NOT EXISTS vector;' >> /docker-entrypoint-initdb.d/01-vector.sql

RUN echo 'CREATE TABLE IF NOT EXISTS scrape_accounts (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, name TEXT);' >> /docker-entrypoint-initdb.d/02-init-table.sql
RUN echo 'CREATE TABLE IF NOT EXISTS relevant_tags (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, tag TEXT);' >> /docker-entrypoint-initdb.d/02-init-table.sql
RUN echo 'CREATE TABLE IF NOT EXISTS auth_tokens (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, token TEXT);' >> /docker-entrypoint-initdb.d/02-init-table.sql
RUN echo 'CREATE TABLE IF NOT EXISTS summaries (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, text TEXT, metadata JSONB, date TIMESTAMP, ref_tweets TEXT, embedding vector(1536));' >> /docker-entrypoint-initdb.d/02-init-table.sql
RUN echo 'CREATE TABLE IF NOT EXISTS tweets (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, text TEXT, metadata JSONB, embedding vector(1536), date TIMESTAMP, url TEXT, tags TEXT);' >> /docker-entrypoint-initdb.d/02-init-table.sql

RUN echo 'CREATE INDEX IF NOT EXISTS tweets_hnsw_index ON summaries USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);' >> /docker-entrypoint-initdb.d/03-build-indices.sql
RUN echo 'CREATE INDEX IF NOT EXISTS summary_hnsw_index ON tweets USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);' >> /docker-entrypoint-initdb.d/03-build-indices.sql

# Clean up
RUN apt-get remove -y --auto-remove \
      build-essential \
      postgresql-server-dev-all \
      libicu-dev \
      libpam0g-dev \
      zlib1g-dev \
      git \
      curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*