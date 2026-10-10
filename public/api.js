// ============================================================
// QuickNotes API Client
// ============================================================
// This file handles all communication with the JSONPlaceholder
// practice API. It demonstrates GET, POST, and DELETE operations
// with proper error handling, validation, and UI state management.
// ============================================================

// API URL constant
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

// ============================================================
// Reusable async request function
// Calls fetch, checks response.ok, and throws on errors.
// ============================================================
async function request(url, options) {
  const response = await fetch(url, Object.assign(
    {
      headers: { 'Content-Type': 'application/json' }
    },
    options || {}
  ));

  if (!response.ok) {
    throw new Error('HTTP error! Status: ' + response.status);
  }

  return response;
}

// ============================================================
// GET: Load 10 notes from the server
// ============================================================
async function loadNotes() {
  var response = await request(API_URL + '?_limit=10');
  var data = await response.json();
  return data;
}

// ============================================================
// POST: Create a new note
// ============================================================
async function createNote(title, body) {
  var response = await request(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      title: title,
      body: body,
      userId: 1
    })
  });
  var data = await response.json();
  return { data: data, status: response.status };
}

// ============================================================
// DELETE: Remove a note by ID
// ============================================================
async function deleteNote(id) {
  var response = await request(API_URL + '/' + id, {
    method: 'DELETE'
  });
  return { status: response.status };
}

// ============================================================
// DOM References
// ============================================================
var statusEl = document.getElementById('status');
var loadBtn = document.getElementById('load-btn');
var noteForm = document.getElementById('note-form');
var titleInput = document.getElementById('title-input');
var bodyInput = document.getElementById('body-input');
var submitBtn = document.getElementById('submit-btn');
var notesList = document.getElementById('notes-list');
var titleError = document.getElementById('title-error');
var notesHeading = document.getElementById('notes-heading');

// ============================================================
// Status message helpers
// Shows loading, success, error, and empty states on the page.
// ============================================================
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = '';

  if (type === 'loading') {
    statusEl.classList.add('status-loading');
  } else if (type === 'success') {
    statusEl.classList.add('status-success');
  } else if (type === 'error') {
    statusEl.classList.add('status-error');
  } else if (type === 'empty') {
    statusEl.classList.add('status-empty');
  }
}

function clearStatus() {
  statusEl.textContent = '';
  statusEl.className = '';
}

// ============================================================
// Validation
// Title is required, max 100 characters.
// ============================================================
function validateTitle(value) {
  if (!value || value.trim() === '') {
    return 'Title is required.';
  }
  if (value.length > 100) {
    return 'Title must be 100 characters or fewer.';
  }
  return '';
}

// ============================================================
// Render helpers
// All user text is inserted with textContent only (no innerHTML)
// to prevent XSS attacks.
// ============================================================
function renderNotes(notes) {
  // Clear existing notes
  notesList.innerHTML = '';

  if (notes.length === 0) {
    showStatus('No notes found. Create your first note above!', 'empty');
    notesHeading.textContent = '📋 Notes (0)';
    return;
  }

  notesHeading.textContent = '📋 Notes (' + notes.length + ')';

  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var li = document.createElement('li');
    li.classList.add('note-item');
    li.setAttribute('data-id', note.id);

    // Note content div
    var contentDiv = document.createElement('div');
    contentDiv.classList.add('note-content');

    var h3 = document.createElement('h3');
    h3.textContent = note.title; // textContent only - safe from XSS

    var p = document.createElement('p');
    p.textContent = note.body; // textContent only - safe from XSS

    var idSpan = document.createElement('span');
    idSpan.classList.add('note-id');
    idSpan.textContent = 'ID: ' + note.id;

    contentDiv.appendChild(h3);
    contentDiv.appendChild(p);
    contentDiv.appendChild(idSpan);

    // Delete button
    var deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn', 'btn-danger');
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.setAttribute('data-id', note.id);
    deleteBtn.addEventListener('click', function () {
      var noteId = parseInt(this.getAttribute('data-id'), 10);
      handleDelete(noteId);
    });

    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);
    notesList.appendChild(li);
  }
}

// ============================================================
// Event Handlers
// ============================================================

// Handle "Load Notes" button click
loadBtn.addEventListener('click', function () {
  handleLoadNotes();
});

// Handle form submission (create note)
noteForm.addEventListener('submit', function (e) {
  e.preventDefault();
  handleCreateNote();
});

// ============================================================
// GET handler: Load notes
// ============================================================
async function handleLoadNotes() {
  // Disable button and show loading state
  loadBtn.disabled = true;
  loadBtn.textContent = '⏳ Loading...';
  showStatus('Loading notes...', 'loading');

  try {
    var notes = await loadNotes();

    if (notes.length === 0) {
      showStatus('No notes found. Create your first note above!', 'empty');
      notesList.innerHTML = '';
      notesHeading.textContent = '📋 Notes (0)';
    } else {
      renderNotes(notes);
      showStatus('Loaded ' + notes.length + ' notes from the server.', 'success');
    }
  } catch (error) {
    showStatus('Failed to load notes: ' + error.message, 'error');
  } finally {
    // Re-enable button
    loadBtn.disabled = false;
    loadBtn.textContent = '⬇ Load Notes';
  }
}

// ============================================================
// POST handler: Create note
// ============================================================
async function handleCreateNote() {
  var title = titleInput.value;
  var body = bodyInput.value;

  // Validate title
  var error = validateTitle(title);
  if (error) {
    titleError.textContent = error;
    return;
  }
  titleError.textContent = '';

  // Disable submit button during request
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Creating...';

  try {
    var result = await createNote(title, body);

    // Create the new note object for local display
    var newNote = {
      id: result.data.id,
      title: title,
      body: body,
      userId: 1
    };

    // Add to top of list
    var currentNotes = getNotesFromDOM();
    currentNotes.unshift(newNote);
    renderNotes(currentNotes);

    // Show success with status code and new id
    showStatus('Note created (status ' + result.status + ', id ' + result.data.id + ').', 'success');

    // Clear form
    titleInput.value = '';
    bodyInput.value = '';
  } catch (error) {
    showStatus('Failed to create note: ' + error.message, 'error');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = '✈ Create Note';
  }
}

// ============================================================
// DELETE handler: Remove note
// ============================================================
// NOTE: JSONPlaceholder does not actually persist DELETE operations.
// When we send DELETE /posts/{id}, the API returns 200 but the note
// still exists on the server. We handle this by optimistically removing
// the note from our local DOM state. In a real production API, the note
// would be permanently deleted from the database.
async function handleDelete(id) {
  try {
    var result = await deleteNote(id);

    if (result.status === 200 || result.status === 204) {
      // Remove note from the DOM
      var currentNotes = getNotesFromDOM();
      var updatedNotes = currentNotes.filter(function (note) {
        return note.id !== id;
      });
      renderNotes(updatedNotes);
      showStatus('Note deleted successfully (status ' + result.status + ').', 'success');
    }
  } catch (error) {
    showStatus('Failed to delete note: ' + error.message, 'error');
  }
}

// ============================================================
// Helper: Read current notes from the DOM
// ============================================================
function getNotesFromDOM() {
  var items = notesList.querySelectorAll('.note-item');
  var notes = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var id = parseInt(item.getAttribute('data-id'), 10);
    var h3 = item.querySelector('h3');
    var p = item.querySelector('p');
    notes.push({
      id: id,
      title: h3 ? h3.textContent : '',
      body: p ? p.textContent : '',
      userId: 1
    });
  }
  return notes;
}

// ============================================================
// Clear validation error on input
// ============================================================
titleInput.addEventListener('input', function () {
  if (titleError.textContent !== '') {
    var error = validateTitle(titleInput.value);
    titleError.textContent = error;
  }
});
