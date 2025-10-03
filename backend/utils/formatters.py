"""
Formatters - форматирование данных для отображения
"""


def format_file_size(size_bytes: int) -> str:
    """Форматирует размер файла в читаемый вид"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def format_data_field(data_size: int) -> str:
    """Форматирует поле DATA для отображения"""
    if data_size > 0:
        return f"{format_file_size(data_size)}"
    else:
        return "NO DATA"

