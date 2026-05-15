import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import VaultGrid from '../components/VaultGrid';
import PinPad from '../components/PinPad';
import { fileAPI, initializeAuthToken } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

type Props = NativeStackScreenProps<any, 'Home'>;

interface File {
  file_id: string;
  original_name: string;
  mimetype: string;
  category: string;
  size_bytes: number;
  uploaded_at: string;
}

const inferMimeType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      case 'mp4':
      case 'mov':
      case 'avi':
        return `video/${ext}`;
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  };

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const CATEGORY_LABELS: Record<string, string> = {
  file: 'Files',
  image: 'Images',
  video: 'Videos',
  document: 'Documents',
};

export default function HomeScreen({ navigation }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      await initializeAuthToken();
      const response = await fileAPI.listFiles();
      setFiles(response.files);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async (type: 'file' | 'image' | 'video' | 'document') => {
    if (!navigation) return;

    const pickerOptions: any = {
      copyToCacheDirectory: true,
      type: '*/*',
    };

    if (type === 'image') {
      pickerOptions.type = 'image/*';
    } else if (type === 'video') {
      pickerOptions.type = 'video/*';
    } else if (type === 'document') {
      pickerOptions.type = DOCUMENT_TYPES;
    }

    const result: any = await DocumentPicker.getDocumentAsync(pickerOptions);
    if (result.type !== 'success') return;

    setUploading(true);
    try {
      const uploadPayload = {
        uri: result.uri,
        name: result.name,
        type: result.mimeType || inferMimeType(result.name),
      };

      console.log('Uploading file:', uploadPayload);
      await fileAPI.uploadFile(uploadPayload, type);
      console.log('File uploaded successfully');
      Alert.alert('Success', 'File uploaded successfully!');
      await loadFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Unable to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    Alert.alert(
      'Delete file',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingFileId(fileId);
              await fileAPI.deleteFile(fileId);
              await loadFiles();
            } catch (error: any) {
              Alert.alert('Delete Failed', error.message || 'Unable to delete file.');
            } finally {
              setDeletingFileId(null);
            }
          },
        },
      ]
    );
  };

  const imageFiles = files.filter((file) => file.category === 'image');
  const videoFiles = files.filter((file) => file.category === 'video');
  const documentFiles = files.filter((file) => file.category === 'document');
  const otherFiles = files.filter((file) => !['image', 'video', 'document'].includes(file.category));

  const renderSection = (category: string, items: File[]) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category]}</Text>
        {items.length === 0 ? (
          <View style={styles.emptySection}>
            <MaterialCommunityIcons name="folder-open-outline" size={36} color="#2d3748" />
            <Text style={styles.emptySectionText}>No {CATEGORY_LABELS[category].toLowerCase()} yet.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.file_id}
            renderItem={({ item }) => (
              <View style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{item.original_name}</Text>
                  <Text style={styles.fileMeta}>{item.mimetype} · {Math.round(item.size_bytes / 1024)} KB</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteFile(item.file_id)}
                  disabled={deletingFileId === item.file_id}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#f87171" />
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FileHider</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.uploadTitle}>Upload Files</Text>
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickFile('image')}
            disabled={uploading}
          >
            <MaterialCommunityIcons name="image" size={24} color="#4f97f7" />
            <Text style={styles.uploadButtonText}>Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickFile('video')}
            disabled={uploading}
          >
            <MaterialCommunityIcons name="video" size={24} color="#4f97f7" />
            <Text style={styles.uploadButtonText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickFile('document')}
            disabled={uploading}
          >
            <MaterialCommunityIcons name="file-document" size={24} color="#4f97f7" />
            <Text style={styles.uploadButtonText}>Document</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickFile('file')}
            disabled={uploading}
          >
            <MaterialCommunityIcons name="file" size={24} color="#4f97f7" />
            <Text style={styles.uploadButtonText}>Other</Text>
          </TouchableOpacity>
        </View>
        {uploading && (
          <View style={styles.uploadingIndicator}>
            <ActivityIndicator size="small" color="#4f97f7" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f97f7" />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      ) : (
        <>
          {renderSection('image', imageFiles)}
          {renderSection('video', videoFiles)}
          {renderSection('document', documentFiles)}
          {renderSection('file', otherFiles)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f97f7',
    marginTop: 4,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#4f97f7',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#a0a0a0',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1a2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  deleteButton: {
    padding: 8,
  },
});
