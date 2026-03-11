.PHONY: install test test-e2e lint build clean

install:
	pip install -e ".[dev]"

test:
	pytest tests/test_client.py tests/test_async_client.py -v

test-e2e:
	KONTEXT_API_KEY=sk_test KONTEXT_BASE_URL=http://localhost:8080 pytest tests/test_e2e.py -v

lint:
	python -m py_compile kontext/client.py
	python -m py_compile kontext/models.py
	python -m py_compile kontext/exceptions.py

build:
	pip install build
	python -m build

clean:
	rm -rf dist/ build/ *.egg-info kontext/*.pyc kontext/__pycache__ tests/__pycache__
