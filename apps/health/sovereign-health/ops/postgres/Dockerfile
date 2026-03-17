# PostgreSQL 16 with pgaudit extension
FROM postgres:16-alpine

# Install clang19 to match the version postgres was built with,
# plus build dependencies for pgaudit
RUN apk add --no-cache --virtual .build-deps \
      git make gcc musl-dev postgresql16-dev krb5-dev clang19 llvm19-dev && \
    git clone --branch REL_16_STABLE https://github.com/pgaudit/pgaudit.git /tmp/pgaudit && \
    cd /tmp/pgaudit && \
    make install USE_PGXS=1 && \
    apk del .build-deps && \
    rm -rf /tmp/pgaudit
