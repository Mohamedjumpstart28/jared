import React, { useState } from 'react';
import axios from 'axios';

interface Contact {
  name: string;
  role: string;
  persona: string;
  startup: string;
  phone: string;
}

interface UploadTabProps {
  onUpload: (contacts: Contact[], roles: string[], columnMapping: ColumnMapping) => void;
}

interface ColumnMapping {
  name: string;
  role: string;
  persona: string;
  startup: string;
  phone: string;
}

const UploadTab: React.FC<UploadTabProps> = ({ onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Contact[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    role: '',
    persona: '',
    startup: '',
    phone: ''
  });

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
      setCsvHeaders(response.data.headers || []);
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
        if (csvColumn && contact[csvColumn as keyof Contact]) {
          transformed[key] = contact[csvColumn as keyof Contact];
        }
      });
      return transformed as Contact;
    });

    onUpload(transformedContacts, roles, columnMapping);
  };

  const autoMapColumns = () => {
    const autoMapping: ColumnMapping = {
      name: '',
      role: '',
      persona: '',
      startup: '',
      phone: ''
    };

    csvHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('name') || lowerHeader.includes('first') || lowerHeader.includes('last')) {
        autoMapping.name = header;
      } else if (lowerHeader.includes('role') || lowerHeader.includes('title') || lowerHeader.includes('position')) {
        autoMapping.role = header;
      } else if (lowerHeader.includes('persona') || lowerHeader.includes('type') || lowerHeader.includes('category')) {
        autoMapping.persona = header;
      } else if (lowerHeader.includes('startup') || lowerHeader.includes('company') || lowerHeader.includes('organization')) {
        autoMapping.startup = header;
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
        autoMapping.phone = header;
      }
    });

    setColumnMapping(autoMapping);
  };

  return (
    <div className="upload-tab">
      <div className="upload-section">
        <h2>Upload Apollo CSV</h2>
        <p>Upload your exported Apollo CSV file to get started with your call session.</p>
        
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
      </div>

      {showMapping && csvHeaders.length > 0 && (
        <div className="mapping-section">
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
