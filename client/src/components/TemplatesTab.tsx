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

const TemplatesTab: React.FC<TemplatesTabProps> = ({ templates, onTemplatesChange }) => {
  // Built-in defaults and local fallback (for deployments without API routes)
  const defaultTemplates: Template = {
    Enterprise: {
      title: 'Enterprise',
      content:
        "Hi {{name}}, this is [Your Name] from [Your Company]. I noticed {{startup}} has been growing rapidly in the {{persona}} space. I help companies like yours streamline their sales processes. Do you have 2 minutes to discuss how we could help {{startup}} increase revenue?",
    },
    Startup: {
      title: 'Startup',
      content:
        "Hi {{name}}, I'm reaching out because I noticed {{startup}} is in the {{persona}} space. I work with companies to help optimize their development workflows. Would you be interested in a quick 5-minute conversation about how we could help {{startup}} accelerate development?",
    },
    SMB: {
      title: 'SMB',
      content:
        "Hi {{name}}, I help companies like {{startup}} increase their close rates. I'd love to share a quick strategy that could help {{startup}} hit their revenue targets faster. Do you have 2 minutes to chat?",
    },
    Tech: {
      title: 'Tech',
      content:
        "Hi {{name}}, I noticed {{startup}} has been doing great work in the {{persona}} space. I help tech companies optimize their lead generation. Would you be interested in a brief conversation about how we could help {{startup}} generate more qualified leads?",
    },
  };
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
      // Fallback when /api/templates is unavailable in the deployment
      try {
        const saved = localStorage.getItem('templates');
        if (saved) {
          onTemplatesChange(JSON.parse(saved));
        } else {
          onTemplatesChange(defaultTemplates);
        }
      } catch (_) {
        onTemplatesChange(defaultTemplates);
      }
    }
  }, [onTemplatesChange]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (persona: string) => {
    setEditingPersona(persona);
    const templateObj = templates[persona];
    setEditingTemplate(templateObj?.content || '');
    setEditingTitle(templateObj?.title || persona);
  };

  const handleSave = async () => {
    if (!editingPersona) return;

    setLoading(true);
    try {
      await axios.put(`/api/templates/${editingPersona}`, {
        template: editingTemplate,
        title: editingTitle
      });
      
      const updatedTemplates = { 
        ...templates, 
        [editingPersona]: {
          title: editingTitle,
          content: editingTemplate
        }
      };
      onTemplatesChange(updatedTemplates);
      try { localStorage.setItem('templates', JSON.stringify(updatedTemplates)); } catch (_) {}
      setEditingPersona(null);
      setEditingTemplate('');
      setEditingTitle('');
    } catch (error) {
      // Update locally if API is not available
      const updatedTemplates = { 
        ...templates, 
        [editingPersona]: {
          title: editingTitle,
          content: editingTemplate
        }
      };
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

  const handleAddTemplate = async () => {
    if (!newPersona.trim() || !newContent.trim()) {
      alert('Please provide a persona key and some template content.');
      return;
    }
    setAdding(true);
    try {
      const personaKey = newPersona.trim();
      await axios.put(`/api/templates/${personaKey}`, {
        template: newContent
      });
      const updatedTemplates = {
        ...templates,
        [personaKey]: {
          title: personaKey,
          content: newContent
        }
      };
      onTemplatesChange(updatedTemplates);
      try { localStorage.setItem('templates', JSON.stringify(updatedTemplates)); } catch (_) {}
      setNewPersona('');
      setNewContent('');
      setShowAddForm(false);
    } catch (error) {
      // Fallback to local update only when API is missing in deployment
      const personaKey = newPersona.trim();
      const updatedTemplates = {
        ...templates,
        [personaKey]: {
          title: personaKey,
          content: newContent
        }
      };
      onTemplatesChange(updatedTemplates);
      try { localStorage.setItem('templates', JSON.stringify(updatedTemplates)); } catch (_) {}
      setNewPersona('');
      setNewContent('');
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  const getAvailableVariables = () => {
    return ['name', 'role', 'persona', 'startup', 'phone'];
  };

  const insertVariable = (variable: string) => {
    const cursorPos = (document.getElementById('template-editor') as HTMLTextAreaElement)?.selectionStart || 0;
    const newTemplate = editingTemplate.slice(0, cursorPos) + `{{${variable}}}` + editingTemplate.slice(cursorPos);
    setEditingTemplate(newTemplate);
  };

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
                
                <textarea
                  id="template-editor"
                  value={editingTemplate}
                  onChange={(e) => setEditingTemplate(e.target.value)}
                  className="template-textarea"
                  rows={6}
                  placeholder="Enter your call script template here..."
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
                <p>{typeof templates[persona] === 'string' ? templates[persona] : (templates[persona] as any)?.content || ''}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="template-help">
        <h4>Template Variables</h4>
        <p>Use these variables in your templates to personalize each call:</p>
        <ul>
          <li><code>{'{{name}}'}</code> - Contact's name</li>
          <li><code>{'{{role}}'}</code> - Contact's role</li>
          <li><code>{'{{persona}}'}</code> - Contact's persona</li>
          <li><code>{'{{startup}}'}</code> - Startup/company name</li>
          <li><code>{'{{phone}}'}</code> - Phone number</li>
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
                placeholder="Enter template content. Use variables like {{name}}, {{startup}}, {{persona}}, {{role}}, {{phone}}"
              />
              <div className="editor-actions">
                <button onClick={handleAddTemplate} disabled={adding} className="save-button">
                  {adding ? 'Adding...' : 'Add Template'}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewPersona(''); setNewContent(''); }} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesTab;
