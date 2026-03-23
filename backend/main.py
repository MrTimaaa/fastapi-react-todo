from typing import List

import auth
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger()
logger.info("Application started")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=("*",),
    allow_credentials=True,
    allow_methods=("*",),
    allow_headers=("*",),
)

# === МАРШРУТЫ АВТОРИЗАЦИИ ===

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    hashed_password = auth.get_password_hash(user.password)
    # Первый пользователь - админ, остальные - user
    is_first = db.query(models.User).count() == 0
    role = "admin" if is_first else "user"
    
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Неудачная попытка авторизации для логина: {form_data.username}")
        raise HTTPException(status_code=400, detail="Неверное имя пользователя или пароль")
    
    logger.info(f"Пользователь {user.username} успешно вошел в систему")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# === МАРШРУТЫ ЗАДАЧ  ===

@app.post("/todos/", response_model=schemas.TodoResponse)
def create_todo(todo: schemas.TodoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Создаем задачу, привязывая её к ID текущего пользователя
    new_todo = models.Todo(**todo.model_dump(), owner_id=current_user.id)
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

@app.get("/todos/", response_model=List[schemas.TodoResponse])
def get_my_todos(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    logger.info("Fetching todos")
    return db.query(models.Todo).filter(models.Todo.owner_id == current_user.id).all()

@app.put("/todos/{todo_id}", response_model=schemas.TodoResponse)
def update_todo(
    todo_id: int, 
    todo_update: schemas.TodoUpdate,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id, models.Todo.owner_id == current_user.id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    
    if todo_update.title is not None:
        todo.title = todo_update.title
    if todo_update.description is not None:
        todo.description = todo_update.description
    if todo_update.completed is not None:
        todo.completed = todo_update.completed
    
    db.commit()
    db.refresh(todo)
    return todo

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id, models.Todo.owner_id == current_user.id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    db.delete(todo)
    db.commit()
    return {"detail": "Задача удалена"}

# === АДМИНКА ===
@app.get("/admin/all-todos", response_model=List[schemas.TodoResponse])
def get_all_todos_admin(db: Session = Depends(get_db), admin_user: models.User = Depends(auth.require_admin)):
    return db.query(models.Todo).all()

# === ЭНДПОИНТ ДЛЯ ФИЛЬТРАЦИИ ===
@app.get("/users/", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), admin_user: models.User = Depends(auth.require_admin)):
    # Возвращаем всех пользователей для выпадающего списка в админке
    return db.query(models.User).all()