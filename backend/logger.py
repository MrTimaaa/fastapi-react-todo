import sys

from loguru import logger

# удаляем стандартный логгер
logger.remove()

# логирование в консоль
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="INFO",
)

# логирование в файл
logger.add(
    "logs/app.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    rotation="10 MB",
    retention="10 days",
    compression="zip",
    level="INFO",
)

def get_logger():
    return logger