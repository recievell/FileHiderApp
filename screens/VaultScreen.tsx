import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { fileAPI } from '../services/api';

type Props = NativeStackScreenProps<any, 'Vault'>;

type VaultFile = {
  file_id: string;
  original_name: string;
  mimetype: string;
  category: string;
  size: number;
  uploaded_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  file: 'Files',
  image: 'Images',
  video: 'Videos',
  document: 'Documents',
};

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export default function VaultScreen({ navigation }: Props) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);

    try {
      const response = await fileAPI.listFiles();
      setFiles(response.files || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to load files');
    } finally {
      setLoading(false);
    }
  };

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

  const pickFile = async (type: 'file' | 'image' | 'video' | 'document') => {
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
      await fetchFiles();
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
              await fetchFiles();
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

  const renderSection = (category: string, items: VaultFile[]) => {
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
                  <Text style={styles.fileMeta}>{item.mimetype} · {Math.round(item.size / 1024)} KB</Text>
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

  const imageFiles = files.filter((file) => file.category === 'image');
  const videoFiles = files.filter((file) => file.category === 'video');
  const documentFiles = files.filter((file) => file.category === 'document');
  const otherFiles = files.filter((file) => !['image', 'video', 'document'].includes(file.category));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left-bold" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File Manager</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.vaultName}>File Manager</Text>
      <Text style={styles.vaultDescription}>Manage your uploaded files below.</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('file')}>
          <MaterialCommunityIcons name="file-plus" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>Add Files</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('image')}>
          <MaterialCommunityIcons name="image-plus" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>Add Images</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('video')}>
          <MaterialCommunityIcons name="video-plus" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>Add Videos</Text>
        </TouchableOpacity>w
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('document')}>
          <MaterialCommunityIcons name="file-document-plus" size={18} color="#ffffff" />
          <Text style={styles.uploadButtonText}>Add Documents</Text>
        </TouchableOpacity>
      </View>

      {uploading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4f97f7" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color="#4f97f7" style={styles.loader} />
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
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  iconDisplayContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a3a52',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  vaultName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  vaultDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f97f7',
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  loadingText: {
    color: '#cad3e8',
    fontSize: 14,
  },
  loader: {
    marginTop: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#2d3748',
    borderRadius: 12,
    backgroundColor: '#141b27',
  },
  emptySectionText: {
    color: '#8a97b4',
    fontSize: 13,
    marginTop: 10,
  },
  fileItem: {
    backgroundColor: '#131d2f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2d3748',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  fileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  fileMeta: {
    color: '#8a97b4',
    fontSize: 12,
  },
});
