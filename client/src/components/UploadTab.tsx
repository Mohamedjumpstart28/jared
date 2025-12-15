import React, { useState, useEffect } from 'react';
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

interface UploadTabProps {
  onUpload: (contacts: Contact[], roles: string[], columnMapping: ColumnMapping) => void;
  savedContacts?: Contact[];
  savedRoles?: string[];
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

const UploadTab: React.FC<UploadTabProps> = ({ onUpload, savedContacts, savedRoles }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Contact[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    role: '',
    persona: '',
    startup: '',
    phone: '',
    linkedin: '',
    template: ''
  });

  // Check for saved data on mount
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem('contacts');
      const savedRoles = localStorage.getItem('roles');
      if (savedContacts && savedRoles) {
        setHasSavedData(true);
      }
    } catch (_) {}
  }, []);

  // If we have saved contacts/roles passed as props, use them
  useEffect(() => {
    if (savedContacts && savedContacts.length > 0) {
      setHasSavedData(true);
    }
  }, [savedContacts, savedRoles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreview(response.data.contacts);
      setRoles(response.data.roles);
      const headers = response.data.headers || [];
      setCsvHeaders(headers);
      
      // Auto-map columns immediately after upload
      const autoMapping: ColumnMapping = {
        name: 'First Name',
        role: 'Hiring Role',
        persona: 'Title',
        startup: 'Company Name',
        phone: 'Mobile Phone',
        linkedin: 'Person Linkedin Url',
        template: 'Template'
      };

      // First pass: Find Person LinkedIn URL specifically (prioritize over company LinkedIn)
      headers.forEach((header: string) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'person linkedin url' || lowerHeader === 'person linkedin') {
          autoMapping.linkedin = header;
        }
      });

      // Second pass: Map all other fields
      headers.forEach((header: string) => {
        const lowerHeader = header.toLowerCase();
        // Override defaults if exact matches exist in CSV
        if (lowerHeader === 'first name' || lowerHeader === 'name') {
          autoMapping.name = header;
        } else if (lowerHeader === 'hiring role') {
          autoMapping.role = header;
        } else if (lowerHeader === 'role title') {
          autoMapping.persona = header;
        } else if (lowerHeader === 'company name') {
          autoMapping.startup = header;
        } else if (lowerHeader === 'mobile phone' || lowerHeader === 'phone') {
          autoMapping.phone = header;
        } else if ((lowerHeader.includes('linkedin') || (lowerHeader.includes('profile') && lowerHeader.includes('url'))) && !autoMapping.linkedin) {
          // Only set LinkedIn if we haven't found Person LinkedIn URL yet
          autoMapping.linkedin = header;
        } else if (lowerHeader.includes('template') || lowerHeader.includes('script')) {
          autoMapping.template = header;
        }
      });

      setColumnMapping(autoMapping);
      setShowMapping(true);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMappingComplete = () => {
    // Transform the contacts using the column mapping
    const transformedContacts = preview.map(contact => {
      const transformed: any = {};
      Object.entries(columnMapping).forEach(([key, csvColumn]) => {
        if (csvColumn && (contact as any)[csvColumn]) {
          transformed[key] = (contact as any)[csvColumn];
        }
      });
      return transformed as Contact;
    });

    // Save to localStorage for persistence
    try {
      localStorage.setItem('contacts', JSON.stringify(transformedContacts));
      localStorage.setItem('roles', JSON.stringify(roles));
      localStorage.setItem('columnMapping', JSON.stringify(columnMapping));
    } catch (_) {}

    onUpload(transformedContacts, roles, columnMapping);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This will remove your contacts and require you to upload the CSV again.')) {
      try {
        localStorage.removeItem('contacts');
        localStorage.removeItem('roles');
        localStorage.removeItem('columnMapping');
        setHasSavedData(false);
        setPreview([]);
        setFile(null);
        setShowMapping(false);
        // Notify parent to clear contacts/roles
        onUpload([], [], {
          name: '',
          role: '',
          persona: '',
          startup: '',
          phone: '',
          linkedin: '',
          template: ''
        });
      } catch (_) {}
    }
  };

  const handleUseSavedData = () => {
    try {
      const savedContacts = localStorage.getItem('contacts');
      const savedRoles = localStorage.getItem('roles');
      const savedMapping = localStorage.getItem('columnMapping');
      
      if (savedContacts && savedRoles) {
        const contacts = JSON.parse(savedContacts);
        const roles = JSON.parse(savedRoles);
        const mapping = savedMapping ? JSON.parse(savedMapping) : {
          name: '',
          role: '',
          persona: '',
          startup: '',
          phone: '',
          linkedin: '',
          template: ''
        };
        
        onUpload(contacts, roles, mapping);
      }
    } catch (_) {}
  };

  const autoMapColumns = () => {
    const autoMapping: ColumnMapping = {
      name: 'First Name',
      role: 'Hiring Role',
      persona: 'Role Title',
      startup: 'Company Name',
      phone: 'Mobile Phone',
      linkedin: '',
      template: ''
    };

    // First pass: Find Person LinkedIn URL specifically (prioritize over company LinkedIn)
    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader === 'person linkedin url' || lowerHeader === 'person linkedin') {
        autoMapping.linkedin = header;
      }
    });

    // Second pass: Map all other fields
    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      // Override defaults if exact matches or better fits exist
      if (lowerHeader === 'first name' || lowerHeader === 'name') {
        autoMapping.name = header;
      } else if (lowerHeader === 'hiring role') {
        autoMapping.role = header;
      } else if (lowerHeader === 'role title') {
        autoMapping.persona = header;
      } else if (lowerHeader === 'company name') {
        autoMapping.startup = header;
      } else if (lowerHeader === 'mobile phone' || lowerHeader === 'phone') {
        autoMapping.phone = header;
      } else if ((lowerHeader.includes('linkedin') || (lowerHeader.includes('profile') && lowerHeader.includes('url'))) && !autoMapping.linkedin) {
        // Only set LinkedIn if we haven't found Person LinkedIn URL yet
        autoMapping.linkedin = header;
      } else if (lowerHeader.includes('template') || lowerHeader.includes('script')) {
        autoMapping.template = header;
      }
    });

    setColumnMapping(autoMapping);
  };

  return (
    <div className="upload-tab">
      {hasSavedData && (savedContacts && savedContacts.length > 0) && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#1e40af', fontSize: '1.25rem' }}>ℹ️</span>
            <div>
              <strong style={{ color: '#1e40af' }}>Data loaded from previous session</strong>
              <div style={{ color: '#1e3a8a', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {savedContacts.length} contacts loaded. You can continue your call session or upload a new CSV file.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleUseSavedData}
              style={{ 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Continue with Saved Data
            </button>
            <button 
              onClick={handleClearData}
              style={{ 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Clear Data
            </button>
          </div>
        </div>
      )}
      
      <div className="upload-section">
        <h2>Upload Apollo CSV</h2>
        <p>Upload your exported Apollo CSV file to get started with your call session.</p>
        
        {hasSavedData && (savedContacts && savedContacts.length > 0) && (
          <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Or upload a new CSV file to replace the current data.
          </p>
        )}
        
        <div className="file-input-container">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="file-input"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="file-input-label">
            {file ? file.name : 'Choose CSV File'}
          </label>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload & Process'}
        </button>

        {showMapping && file && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#166534' }}>✓</span>
            <span style={{ color: '#166534', fontWeight: 500 }}>
              File uploaded: <strong>{file.name}</strong>
            </span>
          </div>
        )}
      </div>

      {showMapping && csvHeaders.length > 0 && (
        <div className="mapping-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.75rem', background: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <strong style={{ color: '#2d3748' }}>Uploaded File:</strong>
              <span style={{ color: '#4a5568', marginLeft: '0.5rem' }}>{file?.name || 'No file selected'}</span>
            </div>
          </div>
          <h3>Map CSV Columns</h3>
          <p>Map your CSV column headers to the template variables. This ensures your call scripts use the correct data.</p>
          
          <div className="mapping-controls">
            <button onClick={autoMapColumns} className="auto-map-button">
              🔄 Auto-Map Columns
            </button>
          </div>

          <div className="column-mapping">
            <div className="mapping-row">
              <label>Name:</label>
              <select 
                value={columnMapping.name} 
                onChange={(e) => setColumnMapping({...columnMapping, name: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>Role:</label>
              <select 
                value={columnMapping.role} 
                onChange={(e) => setColumnMapping({...columnMapping, role: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>Persona:</label>
              <select 
                value={columnMapping.persona} 
                onChange={(e) => setColumnMapping({...columnMapping, persona: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>Startup:</label>
              <select 
                value={columnMapping.startup} 
                onChange={(e) => setColumnMapping({...columnMapping, startup: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>Phone:</label>
              <select 
                value={columnMapping.phone} 
                onChange={(e) => setColumnMapping({...columnMapping, phone: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>LinkedIn (optional):</label>
              <select 
                value={columnMapping.linkedin || ''} 
                onChange={(e) => setColumnMapping({...columnMapping, linkedin: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label>Template:</label>
              <select 
                value={columnMapping.template || ''} 
                onChange={(e) => setColumnMapping({...columnMapping, template: e.target.value})}
              >
                <option value="">Select column...</option>
                {csvHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mapping-actions">
            <button 
              onClick={handleMappingComplete}
              disabled={!columnMapping.name || !columnMapping.role || !columnMapping.persona || !columnMapping.startup || !columnMapping.phone}
              className="complete-mapping-button"
            >
              Complete Mapping & Continue
            </button>
          </div>
        </div>
      )}

      {preview.length > 0 && !showMapping && (
        <div className="preview-section">
          <h3>Preview ({preview.length} contacts)</h3>
          <div className="roles-summary">
            <h4>Roles Found:</h4>
            <div className="role-tags">
              {roles.map(role => (
                <span key={role} className="role-tag">
                  {role} ({preview.filter(c => c.role === role).length})
                </span>
              ))}
            </div>
          </div>
          
          <div className="contacts-preview">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Startup</th>
                  <th>Role</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((contact, index) => (
                  <tr key={index}>
                    <td>{contact.name}</td>
                    <td>{contact.startup}</td>
                    <td>{contact.role}</td>
                    <td>{contact.phone}</td>
                  </tr>
                ))}
                {preview.length > 5 && (
                  <tr>
                    <td colSpan={4} className="more-contacts">
                      ... and {preview.length - 5} more contacts
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTab;
