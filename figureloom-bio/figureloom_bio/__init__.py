"""FigureLoom Bio."""

from .runtime import Runner
from .runtime_extensions import install_runtime_extensions
from .runtime_repeat_reset import install_repeat_reset
from .sequence_management import install_sequence_management
from .platform_expansion import install_platform_expansion

install_runtime_extensions(Runner)
install_repeat_reset(Runner)
install_sequence_management(Runner)
install_platform_expansion(Runner)

__version__ = "0.3.0"

__all__ = ["Runner", "__version__"]
