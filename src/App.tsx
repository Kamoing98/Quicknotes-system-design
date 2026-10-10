import { useState, useRef, useCallback } from 'react';

// API URL constant - using JSONPlaceholder as practice API
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

// Reusable async request function that calls fetch, checks response.ok, and throws on errors
async function request(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response;
}

// Load notes from API (GET) - loads 10 notes
async function loadNotes(): Promise<any[]> {
  const response = await request(`${API_URL}?_limit=10`);
  const data = await response.json();
  return data;
}

// Create a note (POST)
async function createNote(title: string, body: string): Promise<any> {
  const response = await request(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      userId: 1,
    }),
  });
  const data = await response.json();
  return { data, status: response.status };
}

// Delete a note (DELETE)
async function deleteNote(id: number): Promise<{ status: number }> {
  const response = await request(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  return { status: response.status };
}

interface Note {
  id: number;
  title: string;
  body: string;
  userId: number;
}

type StatusType = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({ type: 'idle', message: '' });
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleError, setTitleError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Validate title input
  const validateTitle = (value: string): string => {
    if (!value.trim()) {
      return 'Title is required.';
    }
    if (value.length > 100) {
      return 'Title must be 100 characters or fewer.';
    }
    return '';
  };

  // Handle load notes button click
  const handleLoadNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    setStatus({ type: 'loading', message: 'Loading notes...' });

    try {
      const data = await loadNotes();

      if (data.length === 0) {
        setStatus({ type: 'empty', message: 'No notes found. Create your first note below!' });
        setNotes([]);
      } else {
        setNotes(data);
        setStatus({ type: 'success', message: `Loaded ${data.length} notes from the server.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setStatus({ type: 'error', message: `Failed to load notes: ${message}` });
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  // Handle form submission (create note)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const error = validateTitle(title);
    if (error) {
      setTitleError(error);
      return;
    }
    setTitleError('');

    setIsSubmitting(true);

    try {
      const { data, status: statusCode } = await createNote(title, body);

      // Add the new note to the top of the list
      const newNote: Note = {
        id: data.id,
        title: title,
        body: body,
        userId: 1,
      };
      setNotes(prev => [newNote, ...prev]);
      setStatus({ type: 'success', message: `Note created (status ${statusCode}, id ${data.id}).` });

      // Clear form
      setTitle('');
      setBody('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setStatus({ type: 'error', message: `Failed to create note: ${message}` });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, body]);

  // Handle delete note
  const handleDelete = useCallback(async (id: number) => {
    // Note: JSONPlaceholder does not actually persist DELETE operations.
    // When we send DELETE /posts/{id}, the API returns 200 but the note
    // still exists on the server. We handle this by optimistically removing
    // the note from our local state, which is the standard approach for
    // demo/prototype APIs. In a real production API, the note would be
    // permanently deleted from the database.
    try {
      const { status: statusCode } = await deleteNote(id);

      if (statusCode === 200 || statusCode === 204) {
        setNotes(prev => prev.filter(note => note.id !== id));
        setStatus({ type: 'success', message: `Note deleted successfully (status ${statusCode}).` });

        if (notes.length - 1 === 0) {
          setStatus({ type: 'empty', message: 'No notes found. Create your first note below!' });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setStatus({ type: 'error', message: `Failed to delete note: ${message}` });
    }
  }, [notes.length]);

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    if (titleError) {
      setTitleError(validateTitle(value));
    }
  };

  return (
    <div className="container">
      <header>
        <h1>📝 QuickNotes</h1>
        <p>A simple note-taking app with API integration</p>
      </header>

      {/* Status message area - <p id="status"> equivalent */}
      {status.type !== 'idle' && (
        <p
          id="status"
          className={`status-message ${
            status.type === 'loading' ? 'status-loading' :
            status.type === 'success' ? 'status-success' :
            status.type === 'error' ? 'status-error' :
            status.type === 'empty' ? 'status-empty' : ''
          }`}
        >
          {status.type === 'loading' && <span className="spinner"></span>}{' '}
          {status.message}
        </p>
      )}

      {/* Load notes button - <button id="load-btn"> */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          id="load-btn"
          className="btn btn-primary"
          onClick={handleLoadNotes}
          disabled={isLoadingNotes}
        >
          {isLoadingNotes ? (
            <><span className="spinner"></span> Loading...</>
          ) : (
            <><i className="fas fa-download"></i> Load Notes</>
          )}
        </button>
      </div>

      {/* Note form - <form id="note-form"> */}
      <form
        id="note-form"
        className="form-card"
        onSubmit={handleSubmit}
      >
        <h2><i className="fas fa-plus-circle"></i> Create a New Note</h2>

        {/* Title input - <input id="title-input"> */}
        <div className="form-group">
          <label htmlFor="title-input">Title *</label>
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter note title (max 100 characters)"
            maxLength={100}
            disabled={isSubmitting}
          />
          {titleError && <p className="form-error">{titleError}</p>}
        </div>

        {/* Body textarea - <textarea id="body-input"> */}
        <div className="form-group">
          <label htmlFor="body-input">Body (optional)</label>
          <textarea
            id="body-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter note content..."
            disabled={isSubmitting}
          />
        </div>

        {/* Submit button - <button id="submit-btn"> */}
        <button
          id="submit-btn"
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><span className="spinner"></span> Creating...</>
          ) : (
            <><i className="fas fa-paper-plane"></i> Create Note</>
          )}
        </button>
      </form>

      {/* Notes list - <ul id="notes-list"> */}
      <div className="notes-section">
        <h2><i className="fas fa-sticky-note"></i> Notes ({notes.length})</h2>

        {notes.length === 0 && status.type === 'idle' && (
          <p className="status-message status-empty">
            Click "Load Notes" to fetch notes from the server, or create a new note above.
          </p>
        )}

        {notes.length === 0 && status.type === 'empty' && (
          <p className="status-message status-empty">
            No notes found. Create your first note above!
          </p>
        )}

        <ul id="notes-list" className="notes-list">
          {notes.map(note => (
            <li key={note.id} className="note-item">
              <div className="note-content">
                {/* User text inserted with textContent only - in React, JSX text content is automatically escaped */}
                <h3>{note.title}</h3>
                <p>{note.body}</p>
                <span className="note-id">ID: {note.id}</span>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(note.id)}
                title="Delete this note"
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Documentation links */}
      <div className="docs-nav">
        <h2><i className="fas fa-book"></i> System Design Documents</h2>
        <ul>
          <li>
            <a href="docs/api-design.md" target="_blank" rel="noopener noreferrer">
              📡 API Design Document
            </a>
            — REST endpoints, request/response examples, error codes
          </li>
          <li>
            <a href="docs/data-model.md" target="_blank" rel="noopener noreferrer">
              🗄️ Data Model Document
            </a>
            — Entity relationships, SQL schema, queries, indexes
          </li>
          <li>
            <a href="docs/architecture.md" target="_blank" rel="noopener noreferrer">
              🏗️ Architecture Document
            </a>
            — System design, load estimates, component diagram, trade-offs
          </li>
        </ul>
      </div>
    </div>
  );
}
