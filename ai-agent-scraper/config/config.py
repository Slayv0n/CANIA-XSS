from dataclasses import dataclass
from environs import Env

@dataclass
class TgBot:
    token: str

@dataclass
class AiAgent:
    token: str
    id_model: str

@dataclass
class Config:
    agent: AiAgent
    bot: TgBot

def load_config(path: str | None = None) -> Config:


    env = Env()
    env.read_env()

    return Config(
        agent=AiAgent(
            token=env('OPENAI_API_KEY'),
            id_model=env('ID_MODEL')
        ),
        bot=TgBot(
            token=env('BOT_TOKEN')
        )
    )