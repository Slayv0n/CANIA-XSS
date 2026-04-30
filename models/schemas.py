from pydantic import BaseModel, Field
from typing import List, Optional

class InputField(BaseModel):
    index: int
    tag: str
    type: Optional[str] = None
    name: Optional[str] = None
    id: Optional[str] = None
    placeholder: Optional[str] = None

class SiteMap(BaseModel):
    url: str
    tech_stack: List[str]
    inputs: List[InputField]

class AttackVector(BaseModel):
    field_index: int
    payload: str
    result: str # "Success (Alert)", "Reflected", "Failed"

class FinalReport(BaseModel):
    target: str
    vulnerabilities_found: int
    details: List[AttackVector]
    recommendation: str

class AttackResults(BaseModel):
    results: List[AttackVector] = Field(..., description="Список всех проведенных атак и их результатов")
