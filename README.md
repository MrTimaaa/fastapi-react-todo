# Инструкция по установке
1. Разработка велась в Visual Studio Code. Все технологии были обновлены до последних версий. Рекомендуется использовать то же самое.
2. Для работы проекта убедитесь, что у вас установлены Python 3.9+ и Node.js.
3. Откройте терминал и выполните команды: git clone https://github.com/MrTimaaa/fastapi-react-todo.git; cd fastapi-react-todo.

## Backend

1. В терминале перейдите в папку бэкенда: cd backend.
2. Установите необходимые зависимости: pip install "fastapi[standard]" sqlalchemy pydantic passlib "bcrypt==4.0.1" PyJWT python-multipart loguru.
3. Запустите сервер: fastapi dev main.py.

## Frontend

1. Откройте новую вкладку терминала (не закрывая бэкенд) и перейдите в папку фронтенда: cd frontend.
2. Установите зависимости: npm install; npm install @tailwindcss/vite
3. Запустите сервер разработки: npm run dev