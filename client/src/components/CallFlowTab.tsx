import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Contact {
  name: string;
  role: string;
  persona: string;
  startup: string;
  phone: string;
  linkedin?: string;
  template?: string;
}

interface Template {
  [key: string]: {
    title: string;
    content: string;
  };
}

interface CallFlowTabProps {
  contacts: Contact[];
  roles: string[];
  templates: Template;
}

// Enhanced formatter: bold, italic, bullets, numbers, headings, nested lists using leading spaces (2 spaces per level)
const renderBasicFormatting = (text: string) => {
  const esc = (s: string) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string));
  const safe = esc(text);

  const headingProcessed = safe
    .split('\n')
    .map(line => {
      if (/^\s*###\s+/.test(line)) return `<h3>${line.replace(/^\s*###\s+/, '')}</h3>`;
      if (/^\s*##\s+/.test(line)) return `<h2>${line.replace(/^\s*##\s+/, '')}</h2>`;
      if (/^\s*#\s+/.test(line)) return `<h1>${line.replace(/^\s*#\s+/, '')}</h1>`;
      return line;
    })
    .join('\n');

  let html = headingProcessed
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

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
    while (listStack.length < level) {
      listStack.push(type);
      out.push(type === 'ul' ? '<ul>' : '<ol>');
    }
    if (listStack.length === level && listStack[level - 1] && listStack[level - 1] !== type) {
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
      const level = Math.max(0, Math.floor(indent.replace(/\t/g, '  ').length / 2)) + 1;
      const type: ListType = /^\d+\./.test(bullet) ? 'ol' : 'ul';

      closeToLevel(level - 1);
      ensureLevelType(level, type);
      out.push(`<li>${content}</li>`);
      continue;
    }

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

  closeToLevel(0);

  return out.join('');
};

const CallFlowTab: React.FC<CallFlowTabProps> = ({ contacts, roles, templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [sendingToSlack, setSendingToSlack] = useState(false);
  const [sentToSlack, setSentToSlack] = useState<boolean[]>([]);

  // Get unique template values from contacts
  const availableTemplates = Array.from(new Set(
    contacts
      .filter(contact => contact.template)
      .map(contact => contact.template!)
  ));

  // Find template key in templates object by matching the title with the template value
  const findTemplateKey = (templateValue: string): string | null => {
    // First try to find by title matching the template value
    const byTitle = Object.keys(templates || {}).find(k => 
      (templates as any)[k]?.title === templateValue
    );
    if (byTitle) return byTitle;
    
    // Fallback: try to find by key matching the template value
    const byKey = Object.keys(templates || {}).find(k => k === templateValue);
    if (byKey) return byKey;
    
    return null;
  };

  const generateScript = useCallback(() => {
    if (filteredContacts.length === 0 || currentIndex >= filteredContacts.length) return;

    const templateKey = findTemplateKey(selectedTemplate);
    if (!templateKey) {
      setCurrentScript('No templates match the selected template.');
      return;
    }

    // Get template from local state (templates prop) - this ensures we use the latest changes
    const templateObj = templates[templateKey];
    if (!templateObj) {
      setCurrentScript('Template not found.');
      return;
    }

    // Get template content
    let script = typeof templateObj === 'string' ? templateObj : (templateObj?.content || '');
    
    // Apply template by replacing {{variable}} placeholders with contact data
    const contact = filteredContacts[currentIndex];
    if (contact && typeof contact === 'object') {
      for (const key of Object.keys(contact)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const value = (contact as any)[key];
        script = script.replace(placeholder, value || '');
      }
    }

    setCurrentScript(script);
  }, [filteredContacts, currentIndex, selectedTemplate, templates]);

  useEffect(() => {
    if (!selectedTemplate && availableTemplates.length > 0) {
      setSelectedTemplate(availableTemplates[0]);
    }
  }, [availableTemplates, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      const filtered = contacts.filter(contact => 
        contact.template === selectedTemplate
      );
      setFilteredContacts(filtered);
      setCurrentIndex(0);
      setSentToSlack(new Array(filtered.length).fill(false));
    }
  }, [selectedTemplate, contacts]);

  useEffect(() => {
    if (filteredContacts.length > 0 && currentIndex < filteredContacts.length) {
      generateScript();
    }
  }, [filteredContacts, currentIndex, selectedTemplate, generateScript]);

  const handleNext = () => {
    if (currentIndex < filteredContacts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSendToSlack = async () => {
    if (filteredContacts.length === 0 || currentIndex >= filteredContacts.length) return;

    setSendingToSlack(true);
    try {
      await axios.post('/api/send-to-slack', {
        contact: filteredContacts[currentIndex]
      });
      const newSentToSlack = [...sentToSlack];
      newSentToSlack[currentIndex] = true;
      setSentToSlack(newSentToSlack);
    } catch (error) {
      console.error('Error sending to Slack:', error);
      alert('Error sending to Slack. Please check your Slack configuration.');
    } finally {
      setSendingToSlack(false);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="call-flow-tab">
        <div className="no-contacts">
          <h2>No Contacts Loaded</h2>
          <p>Please upload a CSV file first to start making calls.</p>
        </div>
      </div>
    );
  }

  const currentContact = filteredContacts[currentIndex];

  return (
    <div className="call-flow-tab">
      <div className="callflow-subheader">
        <div className="persona-selector">
          <label htmlFor="template-select">Select Template Group:</label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="persona-select"
          >
            {availableTemplates.map(templateValue => (
              <option key={templateValue} value={templateValue}>
                {templateValue} ({contacts.filter(c => c.template === templateValue).length})
              </option>
            ))}
          </select>
        </div>

        {filteredContacts.length > 0 && (
          <div className="subheader-nav">
            <button 
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="nav-button"
            >
              ← Previous
            </button>
            <span className="contact-counter">
              {currentIndex + 1} of {filteredContacts.length}
            </span>
            <button 
              onClick={handleNext}
              disabled={currentIndex === filteredContacts.length - 1}
              className="nav-button"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {filteredContacts.length > 0 && currentContact && (
        <div className="callflow-grid">
          <div className="contact-card">
            <div className="contact-header">
              <div className="contact-main">
                <h3>{currentContact.name}</h3>
                <div className="contact-details">
                  <p><strong>Startup:</strong> {currentContact.startup}</p>
                  <p><strong>Role:</strong> {currentContact.role}</p>
                  <p><strong>Persona:</strong> {currentContact.persona}</p>
                  <p><strong>Phone:</strong> {currentContact.phone}</p>
                </div>
              </div>
            </div>
            <div className="contact-actions">
              {currentContact.linkedin && (
                <a 
                  href={currentContact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linkedin-button"
                  title="View LinkedIn"
                >
                  <img src={'/linkedin.png'} alt="LinkedIn" className="linkedin-icon-fill" />
                </a>
              )}
              <button 
                onClick={handleSendToSlack}
                disabled={sendingToSlack || sentToSlack[currentIndex]}
                className={`slack-button ${sentToSlack[currentIndex] ? 'sent' : ''}`}
              >
                {sendingToSlack ? 'Sending...' : sentToSlack[currentIndex] ? '✅ Sent' : (
                  <>
                    <img src={'/slack.png'} alt="Slack" className="slack-icon" />
                    Send Number to Slack
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="script-card">
            <div className="script-content" dangerouslySetInnerHTML={{__html: renderBasicFormatting(currentScript)}} />
          </div>
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="no-contacts-role">
          <h3>No contacts found for {selectedTemplate}</h3>
          <p>Try selecting a different template group.</p>
        </div>
      )}
    </div>
  );
};

export default CallFlowTab;
