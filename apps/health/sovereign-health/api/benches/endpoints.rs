use criterion::{criterion_group, criterion_main, Criterion};
use sovereign_health_backend::handlers::health::{health, hello};

fn bench_health_handler(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    c.bench_function("GET /health", |b| {
        b.iter(|| rt.block_on(health(None)));
    });
}

fn bench_hello_handler(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    c.bench_function("GET /api/v1/hello", |b| {
        b.iter(|| rt.block_on(hello()));
    });
}

criterion_group!(benches, bench_health_handler, bench_hello_handler);
criterion_main!(benches);
