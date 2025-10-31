import React, { useState } from 'react';
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
}

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template>({});

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
              setActiveTab('templates');
            }}
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
