from backend.services.gemini import GeminiService
from backend.services.deepseek import DeepSeekService
from backend.services.collation import ScriptCollator

try:
    g = GeminiService()
    d = DeepSeekService()
    c = ScriptCollator(g)
    print("Backend Services Initialized Successfully")
except Exception as e:
    print(f"Service Init Failed: {e}")
