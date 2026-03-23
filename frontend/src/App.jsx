import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

function App() {
  // === 1. СОСТОЯНИЯ ===
  const { 0: token, 1: setToken } = useState(localStorage.getItem('token') || '');
  const { 0: user, 1: setUser } = useState(null);
  
  const { 0: isLoginView, 1: setIsLoginView } = useState(true);
  const { 0: username, 1: setUsername } = useState('');
  const { 0: password, 1: setPassword } = useState('');
  const { 0: authError, 1: setAuthError } = useState('');

  const { 0: todos, 1: setTodos } = useState([]);
  
  // Состояния для Админки
  const { 0: adminTodos, 1: setAdminTodos } = useState([]); 
  const { 0: usersList, 1: setUsersList } = useState([]); // <-- Список пользователей для фильтра
  const { 0: filterUserId, 1: setFilterUserId } = useState(''); // <-- Выбранный ID для фильтрации
  const { 0: showAdminPanel, 1: setShowAdminPanel } = useState(false);

  // Поля ввода
  const { 0: title, 1: setTitle } = useState('');
  const { 0: description, 1: setDescription } = useState('');

  // Редактирование
  const { 0: editingId, 1: setEditingId } = useState(null);
  const { 0: editTitle, 1: setEditTitle } = useState('');
  const { 0: editDesc, 1: setEditDesc } = useState('');

  // === 2. ФУНКЦИИ ===
  const logout = () => {
    setToken('');
    setUser(null);
    setTodos([]);
    setAdminTodos([]);
    setUsersList([]);
    setShowAdminPanel(false);
    localStorage.removeItem('token');
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (error) {
      console.error(error);
      logout();
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await axios.get(`${API_URL}/todos/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Загружаем ВСЕ задачи (для админа)
  const fetchAdminTodos = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/all-todos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminTodos(res.data);
    } catch (error) {
      console.error("Ошибка доступа к задачам:", error);
    }
  };

  // Загружаем ВСЕХ пользователей (для фильтра)
  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersList(res.data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    }
  };

  const toggleAdminPanel = () => {
    if (!showAdminPanel) {
      fetchAdminTodos();
      fetchAllUsers(); // <-- Подгружаем список людей при открытии админки
    }
    setShowAdminPanel(!showAdminPanel);
    setFilterUserId(''); // Сбрасываем фильтр при переключении
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginView) {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        const res = await axios.post(`${API_URL}/token`, params);
        
        setToken(res.data.access_token);
        localStorage.setItem('token', res.data.access_token);
      } else {
        await axios.post(`${API_URL}/register`, { username, password });
        setIsLoginView(true);
        setAuthError('Успешная регистрация! Теперь войдите.');
      }
      setUsername('');
      setPassword('');
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Произошла ошибка');
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const payload = { title: title, description: description };
      const res = await axios.post(`${API_URL}/todos/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newTodoList = todos.concat(res.data);
      setTodos(newTodoList);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error(error);
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDesc(todo.description || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const saveEdit = async (id) => {
    try {
      const payload = { title: editTitle, description: editDesc };
      const res = await axios.put(`${API_URL}/todos/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(todos.map(t => (t.id === id ? res.data : t)));
      setEditingId(null);
      // Если мы в админке, обновляем и её список
      if (showAdminPanel) fetchAdminTodos();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTodo = async (todo) => {
    try {
      const payload = { completed: !todo.completed };
      const res = await axios.put(`${API_URL}/todos/${todo.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(todos.map(t => (t.id === todo.id ? res.data : t)));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API_URL}/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(todos.filter(t => t.id !== id));
      if (showAdminPanel) fetchAdminTodos();
    } catch (error) {
      console.error(error);
    }
  };

  // === 3. ЭФФЕКТЫ ===
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchTodos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Array.of(token));

  // Логика фильтрации для админки
  const filteredAdminTodos = adminTodos.filter(todo => {
    // Если фильтр пустой - показываем всё
    if (!filterUserId) return true;
    // Иначе сравниваем ID владельца
    return todo.owner_id === parseInt(filterUserId);
  });

  const sortedTodos = todos.slice().sort((a, b) => {
    if (a.completed === b.completed) return a.id - b.id;
    return a.completed ? 1 : -1;
  });

  // === 4. UI: ВХОД ===
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {isLoginView ? 'Вход в TODO' : 'Регистрация'}
          </h2>
          {authError && <p className="text-red-500 text-sm mb-4 text-center">{authError}</p>}
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="text"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {isLoginView ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="w-full mt-4 text-sm text-blue-600 hover:underline"
          >
            {isLoginView ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    );
  }

  // === 5. UI: ГЛАВНЫЙ ЭКРАН ===
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        {/* Шапка */}
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{user?.username}</span>
            {user?.role === 'admin' && (
              <span className="bg-red-500 text-xs px-2 py-1 rounded-full font-bold shadow">
                ADMIN
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <button 
                onClick={toggleAdminPanel} 
                className={`text-sm px-3 py-1 rounded border transition ${showAdminPanel ? 'bg-white text-blue-600' : 'bg-blue-500 text-white border-white hover:bg-blue-400'}`}
              >
                {showAdminPanel ? 'Мои задачи' : 'Админ-панель'}
              </button>
            )}

            <button onClick={logout} className="text-sm bg-blue-800 px-3 py-1 rounded hover:bg-blue-900 transition">
              Выйти
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* === РЕЖИМ АДМИН-ПАНЕЛИ === */}
          {showAdminPanel ? (
            <div>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">
                  Все задачи
                </h2>
                
                {/* ФИЛЬТР ПОЛЬЗОВАТЕЛЕЙ */}
                <select 
                  className="border p-2 rounded text-sm bg-white"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                >
                  <option value="">Все пользователи</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {filteredAdminTodos.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Нет задач по выбранному фильтру.</p>
                ) : (
                  filteredAdminTodos.map(todo => (
                    <div key={todo.id} className="p-3 border rounded-lg bg-yellow-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{todo.title}</p>
                        <p className="text-sm text-gray-600">{todo.description || "Нет описания"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Автор: <span className="font-bold text-gray-600">{todo.owner.username}</span> | 
                          Статус: {todo.completed ? 'Выполнено' : 'В процессе'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            
            /* === ОБЫЧНЫЙ РЕЖИМ === */
            <>
              {/* Форма добавления */}
              <form onSubmit={addTodo} className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">Новая задача</h3>
                <input
                  type="text"
                  placeholder="Название задачи"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <textarea
                  placeholder="Описание"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
                <button type="submit" className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium">
                  Добавить задачу
                </button>
              </form>

              {/* Список задач */}
              <div className="space-y-3">
                {sortedTodos.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Список задач пуст.</p>
                ) : (
                  sortedTodos.map(todo => (
                    <div key={todo.id} className={`p-3 border rounded-lg transition ${todo.completed ? 'bg-gray-100 opacity-75' : 'bg-white hover:shadow-sm'}`}>
                      {editingId === todo.id ? (
                        <div className="flex flex-col gap-2">
                          <input className="border p-2 rounded" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                          <textarea className="border p-2 rounded h-20 resize-none" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                          <div className="flex gap-2 justify-end mt-1">
                             <button onClick={() => saveEdit(todo.id)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">Сохранить</button>
                             <button onClick={cancelEditing} className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 text-sm">Отмена</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 overflow-hidden w-full">
                            <input
                              type="checkbox"
                              checked={todo.completed}
                              onChange={() => toggleTodo(todo)}
                              className="mt-1.5 w-5 h-5 text-blue-600 rounded cursor-pointer flex-shrink-0"
                            />
                            <div className="flex flex-col w-full min-w-0 pr-2">
                              <span className={`text-lg font-medium truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {todo.title}
                              </span>
                              {todo.description && (
                                <p className={`text-sm break-words whitespace-pre-wrap ${todo.completed ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {todo.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 self-center">
                            <button onClick={() => startEditing(todo)} className="text-blue-500 hover:text-blue-700 p-1">✎</button>
                            <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-700 font-bold p-1">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;