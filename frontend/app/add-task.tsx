import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { formatDisplayDate, toISODate, parseISODate } from '@/src/utils/dates';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AddTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ taskId?: string; edit?: string }>();
  const isEdit = params.edit === '1';

  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTask, setFetchingTask] = useState(isEdit);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users').then(setUsers).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isEdit && params.taskId) {
      api.get('/tasks').then((tasks) => {
        const task = tasks.find((t: any) => t.id === params.taskId);
        if (task) {
          setTitle(task.title || '');
          setDeadline(task.deadline || '');
          setNotes(task.notes || '');
          setAssignedTo(task.assigned_to || '');
        }
        setFetchingTask(false);
      }).catch(() => setFetchingTask(false));
    }
  }, [isEdit, params.taskId]);

  const handleDateConfirm = (date: Date) => {
    setDeadline(toISODate(date));
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        deadline: deadline || null,
        notes: notes || null,
        assigned_to: assignedTo || (user?.id || null),
      };
      if (isEdit && params.taskId) {
        await api.put(`/tasks/${params.taskId}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingTask) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.maroon} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Task' : 'New Task'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                testID="task-title-input"
                style={styles.input}
                placeholder="What needs to be done?"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deadline</Text>
              <TouchableOpacity
                testID="task-deadline-picker"
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.brand.maroon} />
                <Text style={[styles.datePickerText, !deadline && styles.placeholder]}>
                  {deadline ? formatDisplayDate(deadline) : 'Select date'}
                </Text>
                {deadline ? (
                  <TouchableOpacity onPress={() => setDeadline('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={deadline ? parseISODate(deadline) : new Date()}
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>

            {user?.role === 'admin' && users.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {users.map((u: any) => (
                    <TouchableOpacity
                      key={u.id}
                      testID={`assign-user-${u.id}`}
                      style={[styles.userChip, assignedTo === u.id && styles.userChipActive]}
                      onPress={() => setAssignedTo(u.id)}
                    >
                      <Text style={[styles.userChipText, assignedTo === u.id && styles.userChipTextActive]}>
                        {u.name || u.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                testID="task-notes-input"
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              testID="save-task-btn"
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? 'Update Task' : 'Create Task'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  form: { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  inputGroup: { gap: Spacing.xs },
  label: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text.primary, marginLeft: Spacing.xs },
  input: {
    backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56, paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md, color: Colors.text.primary,
  },
  textArea: { height: 120, paddingTop: Spacing.md },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.ui.border,
    borderRadius: BorderRadius.lg, height: 56, paddingHorizontal: Spacing.lg,
  },
  datePickerText: { flex: 1, fontSize: FontSizes.md, color: Colors.text.primary },
  placeholder: { color: '#999' },
  userChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm, borderWidth: 1, borderColor: 'transparent',
  },
  userChipActive: { backgroundColor: Colors.brand.maroon + '15', borderColor: Colors.brand.maroon },
  userChipText: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  userChipTextActive: { color: Colors.brand.maroon, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.brand.maroon, height: 56,
    borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center',
    marginTop: Spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.text.inverse, fontSize: FontSizes.lg, fontWeight: '600' },
});
