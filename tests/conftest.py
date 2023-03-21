import logging
import subprocess
from contextlib import closing

import pytest

DEFAULT_API_TOKEN = 'e2e-API-token^^'
PASSWORD = "e2e-test"
NODES = {
    "1": {
        "p2p_port": 19091,
        "api_port": 13301,
        "private_key": "0x1f5b172a64947589be6e279fbcbc09aca6e623a64a92aa359fae9c6613b7e801",
    },
    "2": {
        "p2p_port": 19092,
        "api_port": 13302,
        "private_key": "0xcb9c3533beb75b996b6c77150ecda32134d13710a16121f04dc591113329cd7c",
    },
    "3": {
        "p2p_port": 19093,
        "api_port": 13303,
        "private_key": "0x9a96a7711e2e9c9f71767bb9f248f699b29aebe7f590de8eeec0e71796b869e0",
    },
    "4": {
        "p2p_port": 19094,
        "api_port": 13304,
        "private_key": "0x7dea49b4dbeea4dcbbb9d071bc7212347748dc3a2f16896f504417236b6adb84",
    },
    "5": {
        "p2p_port": 19095,
        "api_port": 13305,
        "private_key": "0x800fee12d472c1a8448b786eb9e5d6c7f643c78b9727032893da9a6a55db288b",
    },
    "6": {
        "p2p_port": 19096,
        "api_port": 13306,
        "private_key": "0x79b94be0c06dac87139c54416228dcacfb084c6884bbf4e48fff4cab8f40baa6",
    },
    "7": {
        "p2p_port": 19097,
        "api_port": 13307,
        "private_key": "0x9b813edd8a85cffbe3cd2e242dc0992cfa04be15caa9f50b0b03b5ebcb2f770a",
    },
}


def setup_node(*args, **kwargs):
    logging.info(f"Setting up a node with configuration: {args} and {kwargs}")
    pass


def test_sanity():
    assert (len(NODES) == len(set(map(lambda n: n['private_key'], NODES.values()))),
            "All private keys must be unique")

    assert (len(NODES) == len(set(map(lambda n: n['api_port'], NODES.values()))),
            "All API ports must be unique")

    assert (len(NODES) == len(set(map(lambda n: n['p2p_port'], NODES.values()))),
            "All p2p ports must be unique")


def check_socket(address, port):
    import socket
    s = socket.socket()
    try:
        s.connect((address, port))
        return True
    except Exception:
        return False
    finally:
        s.close()


@pytest.fixture(scope="module")
def setup_7_nodes():
    logging.info(f"Setting up a cluster of 7 nodes from the source")

    yield NODES

    # TODO: remove before push
    # try:
    #     exit_code = subprocess.call('../scripts/run-integration-tests-source.sh --skip-cleanup', shell=True)
    #     if exit_code != 0:
    #         raise Exception(f"Failed to set up a local cluster from source")
    #     else:
    #         yield NODES
    # finally:
    #     exit_code = subprocess.call('../scripts/run-integration-tests-source.sh --cleanup-only', shell=True)
    #     if exit_code != 0:
    #         raise Exception(f"Failed to clean up the local cluster created from source")
