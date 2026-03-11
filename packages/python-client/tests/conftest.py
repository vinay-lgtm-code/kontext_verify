"""Shared fixtures for Kontext client tests."""

import pytest

from kontext import Kontext, AsyncKontext


@pytest.fixture
def base_url():
    return "https://api.test.kontext.dev"


@pytest.fixture
def api_key():
    return "sk_test_abc123"


@pytest.fixture
def project_id():
    return "test-project"


@pytest.fixture
def client(base_url, api_key, project_id):
    ctx = Kontext(api_key=api_key, project_id=project_id, base_url=base_url)
    yield ctx
    ctx.close()


@pytest.fixture
def async_client(base_url, api_key, project_id):
    return AsyncKontext(api_key=api_key, project_id=project_id, base_url=base_url)
