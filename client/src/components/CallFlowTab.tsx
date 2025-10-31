import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Contact {
  name: string;
  role: string;
  persona: string;
  startup: string;
  phone: string;
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

const CallFlowTab: React.FC<CallFlowTabProps> = ({ contacts, roles, templates }) => {
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sendingToSlack, setSendingToSlack] = useState(false);
  const [sentToSlack, setSentToSlack] = useState<boolean[]>([]);

  // Template-driven persona titles (use title if present, fallback to key)
  const templatePersonas = Array.from(new Set(
    Object.keys(templates || {}).map(key => (templates as any)[key]?.title || key)
  ));

  // Get unique personas from contacts
  const personas = Array.from(new Set(contacts.map(contact => contact.persona)));

  const findTemplateKeyForPersona = (personaTitle: string): string | null => {
    const byTitle = Object.keys(templates || {}).find(k => (templates as any)[k]?.title === personaTitle);
    if (byTitle) return byTitle;
    const byKey = Object.keys(templates || {}).find(k => k === personaTitle);
    return byKey || null;
  };

  const generateScript = useCallback(async () => {
    if (filteredContacts.length === 0 || currentIndex >= filteredContacts.length) return;

    const templateKey = findTemplateKeyForPersona(selectedPersona);
    if (!templateKey) {
      setCurrentScript('No templates match persona.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/generate-script', {
        contact: filteredContacts[currentIndex],
        persona: templateKey
      });
      setCurrentScript(response.data.script);
    } catch (error) {
      console.error('Error generating script:', error);
      setCurrentScript('Error generating script. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filteredContacts, currentIndex, selectedPersona, templates]);

  useEffect(() => {
    if (!selectedPersona) {
      if (templatePersonas.length > 0) {
        setSelectedPersona(templatePersonas[0]);
      } else if (personas.length > 0) {
        setSelectedPersona(personas[0]);
      }
    }
  }, [templatePersonas, personas, selectedPersona]);

  useEffect(() => {
    if (selectedPersona) {
      const filtered = contacts.filter(contact => 
        contact.persona === selectedPersona
      );
      setFilteredContacts(filtered);
      setCurrentIndex(0);
      // Initialize sentToSlack array for the filtered contacts
      setSentToSlack(new Array(filtered.length).fill(false));
    }
  }, [selectedPersona, contacts]);

  useEffect(() => {
    if (filteredContacts.length > 0 && currentIndex < filteredContacts.length) {
      generateScript();
    }
  }, [filteredContacts, currentIndex, selectedPersona, generateScript]);

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
      
      // Mark this contact as sent to Slack
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
      {/* Sub-header */}
      <div className="callflow-subheader">
        <div className="persona-selector">
          <label htmlFor="persona-select">Select Persona Group:</label>
          <select
            id="persona-select"
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="persona-select"
          >
            {templatePersonas.map(personaTitle => (
              <option key={personaTitle} value={personaTitle}>
                {personaTitle} ({contacts.filter(c => c.persona === personaTitle).length})
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
          {/* Left column: contact card */}
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

          {/* Right column: script card */}
          <div className="script-card">
            {loading ? (
              <div className="script-loading">Generating script...</div>
            ) : (
              <div className="script-content">
                {currentScript}
              </div>
            )}
          </div>
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="no-contacts-role">
          <h3>No contacts found for {selectedPersona}</h3>
          <p>Try selecting a different persona group.</p>
        </div>
      )}
    </div>
  );
};

export default CallFlowTab;
