import React from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { useState, useEffect, useRef } from 'react';
import { getTodos, deleteTodo, updateTodo, addTodo } from './api/todos';
import classNames from 'classnames';
import { Todo } from './types/Todo';

export enum FilterType {
  All = 'all',
  Active = 'active',
  Completed = 'completed',
}

// const USER_ID = 1344;

export const App: React.FC = () => {

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<FilterType>(FilterType.All);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [processingTodoIds, setProcessingTodoIds] = useState<number[]>([]);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  function loadTodos() {
    setLoading(true);

    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    loadTodos();
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMessage('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setIsAdding(true);

    const temp: Todo = {
      id: 0,
      title: trimmedTitle,
      completed: false,
      userId: USER_ID,
    };

    setTempTodo(temp);

    try {
      const newTodo = await addTodo({
        userId: USER_ID,
        title: trimmedTitle,
        completed: false,
      });

      setTodos(current => [...current, newTodo]);
      setNewTitle('');
      setTempTodo(null);
    } catch {
      setErrorMessage('Unable to add a todo');
      setTempTodo(null);
    } finally {
      setIsAdding(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 1000);
    }
  };

  const handleDelete = async (todoId: number) => {
    setProcessingTodoIds(ids => [...ids, todoId]);

    try {
      await deleteTodo(todoId);

      setTodos(current => current.filter(todo => todo.id !== todoId));
    } catch {
      setErrorMessage('Unable to delete a todo');
    } finally {
      setProcessingTodoIds(ids => ids.filter(id => id !== todoId));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 1000);
    }
  };

  const visibleTodos = todos.filter(todo => {
    if (filter === FilterType.Active) {
      return !todo.completed;
    }

    if (filter === FilterType.Completed) {
      return todo.completed;
    }

    return true;
  });

  const hasCompleted = todos.some(todo => todo.completed);

  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);

  const handleClearCompleted = () => {
    todos.filter(todo => todo.completed).forEach(todo => handleDelete(todo.id));
  };

  const handleToggle = async (todo: Todo) => {
    setProcessingTodoIds(ids => [...ids, todo.id]);

    try {
      const updatedTodo = await updateTodo(todo.id, {
        completed: !todo.completed,
      });

      setTodos(currentTodos =>
        currentTodos.map(t => (t.id === todo.id ? updatedTodo : t)),
      );
    } catch {
      setErrorMessage('Unable to update a todo');
    } finally {
      setProcessingTodoIds(ids => ids.filter(id => id !== todo.id));
    }
  };

  const handleToggleAll = async () => {
    const newCompletedStatus = !allCompleted;

    const todosToUpdate = todos.filter(
      todo => todo.completed !== newCompletedStatus,
    );

    todosToUpdate.forEach(todo => {
      handleToggle(todo);
    });
  };

  useEffect(() => {
    if (editingTodoId !== null) {
      editInputRef.current?.focus();
    }
  }, [editingTodoId]);

  const handleRename = async (todo: Todo) => {
    const trimmedTitle = editTitle.trim();

    setProcessingTodoIds(ids => [...ids, todo.id]);

    try {
      // 1. нічого не змінилось → просто закриваємо edit
      if (trimmedTitle === todo.title) {
        setEditingTodoId(null);

        return;
      }

      // 2. пустий title → DELETE
      if (!trimmedTitle) {
        try {
          await deleteTodo(todo.id);

          setTodos(current => current.filter(t => t.id !== todo.id));
          setEditingTodoId(null);
        } catch {
          setErrorMessage('Unable to delete a todo'); // 👈 ВАЖЛИВО
        }

        return;
      }

      // 3. UPDATE
      const updatedTodo = await updateTodo(todo.id, {
        title: trimmedTitle,
      });

      setTodos(current =>
        current.map(t => (t.id === todo.id ? updatedTodo : t)),
      );

      setEditingTodoId(null);
    } catch {
      setErrorMessage('Unable to update a todo');
    } finally {
      setProcessingTodoIds(ids => ids.filter(id => id !== todo.id));
    }
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          {todos.length > 0 && (
            <button
              type="button"
              // className="todoapp__toggle-all active"
              className={classNames('todoapp__toggle-all', {
                active: allCompleted,
              })}
              data-cy="ToggleAllButton"
              onClick={() => handleToggleAll()}
            />
          )}

          {/* Add a todo on form submit */}
          <form onSubmit={handleAdd}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTitle}
              disabled={isAdding}
              onChange={event => setNewTitle(event.target.value)}
            />
          </form>
        </header>
        {/* <section className="todoapp__main" data-cy="TodoList">
          {/* This is a completed todo */}
        <section className="todoapp__main" data-cy="TodoList">
          {visibleTodos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={classNames('todo', {
                completed: todo.completed,
              })}
            >
              {/* <label className="todo__status-label" htmlFor={`todo-${todo.id}`}> */}
              <input
                // id={`todo-${todo.id}`}
                data-cy="TodoStatus"
                type="checkbox"
                className="todo__status"
                checked={todo.completed}
                onChange={() => handleToggle(todo)}
              />
              {/* </label> */}

              {editingTodoId === todo.id ? (
                <form>
                  <input
                    ref={editInputRef}
                    data-cy="TodoTitleField"
                    className="todo__title-field"
                    defaultValue={todo.title}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(todo)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRename(todo);
                      }

                      if (e.key === 'Escape') {
                        setEditingTodoId(null);
                        setEditTitle('');
                      }
                    }}
                  />
                </form>
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => {
                      setEditingTodoId(todo.id);
                      setEditTitle(todo.title);
                    }}
                  >
                    {todo.title}
                  </span>

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => handleDelete(todo.id)}
                  >
                    ×
                  </button>
                </>
              )}

              <div
                data-cy="TodoLoader"
                className={classNames('modal overlay', {
                  'is-active': processingTodoIds.includes(todo.id),
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
          {tempTodo && (
            <div data-cy="Todo" className="todo">
              {/* <label className="todo__status-label"> */}
              <input type="checkbox" className="todo__status" />
              {/* </label> */}

              {editingTodoId === tempTodo.id ? (
                <form>
                  <input
                    data-cy="TodoTitleField"
                    className="todo__title-field"
                    defaultValue={tempTodo.title}
                  />
                </form>
              ) : (
                <span
                  data-cy="TodoTitle"
                  className="todo__title"
                  onDoubleClick={() => setEditingTodoId(tempTodo.id)}
                >
                  {tempTodo.title}
                </span>
              )}

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
              >
                ×
              </button>

              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>
        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filter === FilterType.All,
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilter(FilterType.All)}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filter === FilterType.Active,
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilter(FilterType.Active)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filter === FilterType.Completed,
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter(FilterType.Completed)}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!hasCompleted}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !errorMessage,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {/* show only one message at a time */}
        {errorMessage}
      </div>
    </div>
  );
};
