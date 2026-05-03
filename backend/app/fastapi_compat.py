from inspect import signature

from starlette.routing import Router


def patch_starlette_router_for_fastapi() -> None:
    if "on_startup" in signature(Router.__init__).parameters:
        return

    original_init = Router.__init__

    def compatible_init(self, *args, on_startup=None, on_shutdown=None, **kwargs):
        original_init(self, *args, **kwargs)

    Router.__init__ = compatible_init
