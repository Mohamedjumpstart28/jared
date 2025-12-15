import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Template {
  [key: string]: {
    title: string;
    content: string;
  };
}

interface TemplatesTabProps {
  templates: Template;
  onTemplatesChange: (templates: Template) => void;
}

// Enhanced basic formatter: bold **text**, italic *text* or _text_, bullets "- ", numbers "1. ", headings with #/##/###, nested lists via leading spaces (2 spaces per level)
const renderBasicFormatting = (text: string) => {
  const esc = (s: string) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string));
  const safe = esc(text);
  // Headings first (###, ##, # at line start)
  const headingProcessed = safe
    .split('\n')
    .map(line => {
      if (/^\s*###\s+/.test(line)) return `<h3>${line.replace(/^\s*###\s+/, '')}</h3>`;
      if (/^\s*##\s+/.test(line)) return `<h2>${line.replace(/^\s*##\s+/, '')}</h2>`;
      if (/^\s*#\s+/.test(line)) return `<h1>${line.replace(/^\s*#\s+/, '')}</h1>`;
      return line;
    })
    .join('\n');

  // Bold and italic inline
  let html = headingProcessed
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<em>$2</em>') // _italic_
    .replace(/\*(.+?)\*/g, '<em>$1</em>'); // *italic*

  // Lists with nesting
  const lines = html.split('\n');
  let out: string[] = [];
  type ListType = 'ul' | 'ol';
  let listStack: ListType[] = [];

  const closeToLevel = (level: number) => {
    while (listStack.length > level) {
      const t = listStack.pop();
      out.push(t === 'ul' ? '</ul>' : '</ol>');
    }
  };

  const ensureLevelType = (level: number, type: ListType) => {
    // Bring to level
    while (listStack.length < level) {
      // Default to current type when increasing levels
      listStack.push(type);
      out.push(type === 'ul' ? '<ul>' : '<ol>');
    }
    // If at the same level but wrong type, switch
    if (listStack.length === level && listStack[level - 1] && listStack[level - 1] !== type) {
      // close current level then reopen with correct type
      const prev = listStack.pop();
      if (prev) out.push(prev === 'ul' ? '</ul>' : '</ol>');
      listStack.push(type);
      out.push(type === 'ul' ? '<ul>' : '<ol>');
    }
  };

  for (const rawLine of lines) {
    const listMatch = rawLine.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
    const isHeadingHtml = /^\s*<h[1-3]>/.test(rawLine);

    if (listMatch) {
      const indent = listMatch[1] || '';
      const bullet = listMatch[2];
      const content = listMatch[3];
      const level = Math.max(0, Math.floor(indent.replace(/\t/g, '  ').length / 2)) + 1; // levels start at 1 for first list
      const type: ListType = /^\d+\./.test(bullet) ? 'ol' : 'ul';

      // Adjust stack to desired level/type
      closeToLevel(level - 1);
      ensureLevelType(level, type);
      out.push(`<li>${content}</li>`);
      continue;
    }

    // Non-list line: close all lists
    closeToLevel(0);

    if (isHeadingHtml) {
      out.push(rawLine);
    } else if (rawLine.trim().length) {
      out.push(`<p>${rawLine}</p>`);
    } else {
      // Preserve empty lines as line breaks
      out.push('<br>');
    }
  }

  // Close any remaining lists
  closeToLevel(0);

  return out.join('');
};

const TemplatesTab: React.FC<TemplatesTabProps> = ({ templates, onTemplatesChange }) => {
  const [editingPersona, setEditingPersona] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newPersona, setNewPersona] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await axios.get('/api/templates');
      onTemplatesChange(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [onTemplatesChange]);

  // Removed useEffect that was refetching templates - this was overwriting local changes
  // Templates are loaded initially in App.tsx and updated via onTemplatesChange when saved

  const handleEdit = (persona: string) => {
    setEditingPersona(persona);
    const templateObj = templates[persona];
    setEditingTemplate(templateObj?.content || '');
    setEditingTitle(templateObj?.title || persona);
  };

  const handleSave = async () => {
    if (!editingPersona) return;

    setLoading(true);
    
    const updatedTemplates = {
      ...templates,
      [editingPersona]: {
        title: editingTitle,
        content: editingTemplate
      }
    };
    
    try {
      await axios.put(`/api/templates/${editingPersona}`, {
        template: editingTemplate,
        title: editingTitle
      });
      // Success: update state and persist to localStorage
      onTemplatesChange(updatedTemplates);
      try { localStorage.setItem('templates', JSON.stringify(updatedTemplates)); } catch (_) {}
      setEditingPersona(null);
      setEditingTemplate('');
      setEditingTitle('');
    } catch (error) {
      // API failed (expected on Vercel without KV): still update locally
      console.log('API save failed, persisting locally:', error);
      onTemplatesChange(updatedTemplates);
      try { localStorage.setItem('templates', JSON.stringify(updatedTemplates)); } catch (_) {}
      setEditingPersona(null);
      setEditingTemplate('');
      setEditingTitle('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingPersona(null);
    setEditingTemplate('');
    setEditingTitle('');
  };

  const getAvailableVariables = () => {
    return ['name', 'role', 'persona', 'startup', 'phone'];
  };

  const insertAtSelection = (inserter: (selection: string) => string) => {
    const ta = document.getElementById('template-editor') as HTMLTextAreaElement | null;
    const start = ta?.selectionStart ?? editingTemplate.length;
    const end = ta?.selectionEnd ?? editingTemplate.length;
    const before = editingTemplate.slice(0, start);
    const sel = editingTemplate.slice(start, end);
    const after = editingTemplate.slice(end);
    const result = inserter(sel);
    const next = before + result + after;
    setEditingTemplate(next);
    setTimeout(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = before.length + result.length; }
    }, 0);
  };

  const insertVariable = (variable: string) => insertAtSelection(() => `{{${variable}}}`);
  const wrapSelection = (before: string, after: string = before) => insertAtSelection(sel => `${before}${sel}${after}`);
  const insertBullet = () => insertAtSelection(() => `- `);
  const insertNumber = () => insertAtSelection(() => `1. `);
  const insertHeading = () => insertAtSelection(sel => `## ${sel}`);

  return (
    <div className="templates-tab">
      <div className="templates-header">
        <h2>Call Script Templates</h2>
        <p>Manage and edit your call script templates for different personas. Use variables like {'{{name}}'}, {'{{role}}'}, {'{{persona}}'}, {'{{startup}}'}, and {'{{phone}}'} to personalize each call.</p>
      </div>

      <div className="templates-list">
        {Object.keys(templates).map(persona => (
          <div key={persona} className="template-item">
            <div className="template-header">
              <h3>{templates[persona]?.title || persona}</h3>
              <button 
                onClick={() => handleEdit(persona)}
                className="edit-button"
              >
                Edit
              </button>
            </div>
            
            {editingPersona === persona ? (
              <div className="template-editor">
                <div className="template-title-input">
                  <label htmlFor="template-title">Template Title:</label>
                  <input
                    id="template-title"
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="title-input"
                    placeholder="Enter template title..."
                  />
                </div>

                <div className="variable-buttons">
                  <span>Insert variables:</span>
                  {getAvailableVariables().map(variable => (
                    <button
                      key={variable}
                      onClick={() => insertVariable(variable)}
                      className="variable-button"
                    >
                      {`{{${variable}}}`}
                    </button>
                  ))}
                </div>

                {/* Formatting toolbar */}
                <div className="variable-buttons" style={{marginTop: '0.5rem'}}>
                  <span>Formatting:</span>
                  <button className="variable-button" onClick={() => wrapSelection('**')}>Bold</button>
                  <button className="variable-button" onClick={() => wrapSelection('*')}>Italic</button>
                  <button className="variable-button" onClick={insertBullet}>• Bullet</button>
                  <button className="variable-button" onClick={insertNumber}>1. Numbered</button>
                  <button className="variable-button" onClick={insertHeading}>H2 Heading</button>
                </div>
                
                <textarea
                  id="template-editor"
                  value={editingTemplate}
                  onChange={(e) => setEditingTemplate(e.target.value)}
                  className="template-textarea"
                  rows={8}
                  placeholder="Use **bold**, *italic*, lines starting with - for bullets (indent with spaces), 1. for numbered lists, and ## Heading for headings."
                />
                
                <div className="editor-actions">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="save-button"
                  >
                    {loading ? 'Saving...' : 'Save Template'}
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="template-preview">
                <div dangerouslySetInnerHTML={{__html: renderBasicFormatting(typeof templates[persona] === 'string' ? (templates[persona] as any) : (templates[persona] as any)?.content || '')}} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="template-help">
        <h4>Template Tips</h4>
        <ul>
          <li>Bold: <code>**bold**</code></li>
          <li>Italic: <code>*italic*</code> or <code>_italic_</code></li>
          <li>Bullets: start line with <code>- </code> (indent with spaces for sub-bullets)</li>
          <li>Numbered: start line with <code>1. </code> (indent with spaces for sub-levels)</li>
          <li>Headings: <code>#</code>, <code>##</code>, or <code>###</code> followed by a space</li>
        </ul>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {!showAddForm ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="save-button" onClick={() => setShowAddForm(true)}>
              + Add Template
            </button>
          </div>
        ) : (
          <div className="template-item">
            <div className="template-header">
              <h3>Add New Persona Template</h3>
            </div>
            <div className="template-editor">
              <div className="template-title-input">
                <label htmlFor="new-persona">Persona key (e.g. Enterprise, Startup):</label>
                <input
                  id="new-persona"
                  type="text"
                  value={newPersona}
                  onChange={(e) => setNewPersona(e.target.value)}
                  className="title-input"
                  placeholder="Persona identifier..."
                />
              </div>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="template-textarea"
                rows={5}
                placeholder="Enter template content. Use **bold** and '- ' to create bullet lists"
              />
              <div className="editor-actions">
                <button onClick={async () => {
                  if (!newPersona.trim() || !newContent.trim()) { alert('Please provide a persona key and some template content.'); return; }
                  setAdding(true);
                  try {
                    const personaKey = newPersona.trim();
                    await axios.put(`/api/templates/${personaKey}`, { template: newContent });
                    const updatedTemplates = { ...templates, [personaKey]: { title: personaKey, content: newContent } };
                    onTemplatesChange(updatedTemplates);
                    setNewPersona(''); setNewContent(''); setShowAddForm(false);
                  } catch (e) { console.error(e); alert('Error adding template.'); } finally { setAdding(false); }
                }} disabled={adding} className="save-button">
                  {adding ? 'Adding...' : 'Add Template'}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewPersona(''); setNewContent(''); }} className="cancel-button">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesTab;
