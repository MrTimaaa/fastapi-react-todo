from typing import Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    
    class Config:
        from_attributes = True

class TodoBase(BaseModel):
    title: str
    description: str = ""

class TodoCreate(TodoBase):
    pass

class TodoResponse(TodoBase):
    id: int
    completed: bool
    owner_id: int
    owner: UserResponse

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None