import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import UploadTab from './components/UploadTab';
import TemplatesTab from './components/TemplatesTab';
import CallFlowTab from './components/CallFlowTab';

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

interface ColumnMapping {
  name: string;
  role: string;
  persona: string;
  startup: string;
  phone: string;
  linkedin?: string;
  template?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template>({});

  // Load contacts and roles from localStorage on mount
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem('contacts');
      const savedRoles = localStorage.getItem('roles');
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
      if (savedRoles) {
        setRoles(JSON.parse(savedRoles));
      }
    } catch (_) {}
  }, []);

  // Load templates on mount - prioritize localStorage over API so user edits persist after refresh
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // First check localStorage - it has the most recent user changes
        const saved = localStorage.getItem('templates');
        if (saved) {
          setTemplates(JSON.parse(saved));
          return; // Don't fetch from API if we have localStorage data
        }
        // Only fetch from API if localStorage is empty
        const response = await axios.get('/api/templates');
        setTemplates(response.data.templates);
        // Also save to localStorage for future loads
        try { localStorage.setItem('templates', JSON.stringify(response.data.templates)); } catch (_) {}
      } catch (error) {
        // Fallback to localStorage if API unavailable
        try {
          const saved = localStorage.getItem('templates');
          if (saved) {
            setTemplates(JSON.parse(saved));
          }
        } catch (_) {}
      }
    };
    loadTemplates();
  }, []);

  // Reload templates when switching to Call Flow tab, but prioritize localStorage over API
  // This ensures local changes persist even if API doesn't have them yet
  useEffect(() => {
    if (activeTab === 'callflow') {
      const loadTemplates = async () => {
        try {
          // First check localStorage - it has the most recent user changes
          const saved = localStorage.getItem('templates');
          if (saved) {
            setTemplates(JSON.parse(saved));
            return; // Don't fetch from API if we have localStorage data
          }
          // Only fetch from API if localStorage is empty
          const response = await axios.get('/api/templates');
          setTemplates(response.data.templates);
        } catch (error) {
          try {
            const saved = localStorage.getItem('templates');
            if (saved) {
              setTemplates(JSON.parse(saved));
            }
          } catch (_) {}
        }
      };
      loadTemplates();
    }
  }, [activeTab]);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <img src={process.env.PUBLIC_URL + '/js-banner.jpg'} alt="JUMPSTART Logo" className="logo" />
          <div className="header-text">
            <h1>SDR Script Tool</h1>
            <p>Streamline your cold-calling workflow</p>
          </div>
        </div>
      </header>
      
      <nav className="tab-navigation">
        <button 
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          Upload CSV
        </button>
        <button 
          className={activeTab === 'templates' ? 'active' : ''}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
        <button 
          className={activeTab === 'callflow' ? 'active' : ''}
          onClick={() => setActiveTab('callflow')}
        >
          Call Flow
        </button>
      </nav>

      <main className="tab-content">
        {activeTab === 'upload' && (
          <UploadTab 
            onUpload={(contacts, roles, columnMapping) => {
              setContacts(contacts);
              setRoles(roles);
              // Save to localStorage for persistence across refreshes
              try {
                localStorage.setItem('contacts', JSON.stringify(contacts));
                localStorage.setItem('roles', JSON.stringify(roles));
                localStorage.setItem('columnMapping', JSON.stringify(columnMapping));
              } catch (_) {}
              setActiveTab('templates');
            }}
            savedContacts={contacts}
            savedRoles={roles}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab 
            templates={templates}
            onTemplatesChange={setTemplates}
          />
        )}
        {activeTab === 'callflow' && (
          <CallFlowTab 
            contacts={contacts}
            roles={roles}
            templates={templates}
          />
        )}
      </main>
    </div>
  );
}

export default App;
