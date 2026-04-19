import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/utils/api';
import { formatDisplayDate, isOverdue, isToday } from '@/src/utils/dates';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TasksScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  const fetchTasks = useCallback(async () => {
    try {
      const endpoint = viewMode === 'all' && user?.role === 'admin' ? '/tasks/all' : '/tasks/my';
      const res = await api.get(endpoint);
      setTasks(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTasks();
    }, [fetchTasks])
  );

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteTask = (task: any) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/tasks/${task.id}`);
            fetchTasks();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <TouchableOpacity
            testID="add-task-btn"
            style={styles.addBtn}
            onPress={() => router.push('/add-task')}
          >
            <Ionicons name="add" size={22} color={Colors.text.inverse} />
            <Text style={styles.addBtnText}>Add Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* View Toggle */}
      {user?.role === 'admin' && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            testID="my-tasks-tab"
            style={[styles.toggleBtn, viewMode === 'my' && styles.toggleActive]}
            onPress={() => setViewMode('my')}
          >
            <Text style={[styles.toggleText, viewMode === 'my' && styles.toggleTextActive]}>My Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="all-tasks-tab"
            style={[styles.toggleBtn, viewMode === 'all' && styles.toggleActive]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleTextActive]}>All Tasks</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.maroon} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor={Colors.brand.maroon} />}
          showsVerticalScrollIndicator={false}
        >
          {tasks.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={60} color={Colors.brand.goldMuted} />
              <Text style={styles.emptyTitle}>No Tasks Yet</Text>
              <Text style={styles.emptyText}>Add your first task to get started</Text>
            </View>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Pending ({pendingTasks.length})</Text>
                  {pendingTasks.map((task, idx) => (
                    <View key={task.id || idx} style={styles.taskCard} testID={`task-item-${idx}`}>
                      <TouchableOpacity
                        testID={`task-toggle-${idx}`}
                        style={styles.checkbox}
                        onPress={() => toggleStatus(task)}
                      >
                        <View style={styles.checkboxEmpty} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.taskContent}
                        onPress={() => router.push({ pathname: '/add-task', params: { taskId: task.id, edit: '1' } })}
                      >
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        {task.deadline && (
                          <View style={styles.taskMeta}>
                            <Ionicons
                              name="time-outline" size={14}
                              color={isOverdue(task.deadline) ? Colors.ui.error : Colors.text.secondary}
                            />
                            <Text style={[
                              styles.taskDeadline,
                              isOverdue(task.deadline) && styles.overdue,
                              isToday(task.deadline) && styles.today,
                            ]}>
                              {isOverdue(task.deadline) ? 'Overdue: ' : isToday(task.deadline) ? 'Today: ' : ''}
                              {formatDisplayDate(task.deadline)}
                            </Text>
                          </View>
                        )}
                        {task.notes && <Text style={styles.taskNotes} numberOfLines={1}>{task.notes}</Text>}
                      </TouchableOpacity>
                      {user?.role === 'admin' && (
                        <TouchableOpacity testID={`task-delete-${idx}`} onPress={() => deleteTask(task)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={18} color={Colors.ui.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {completedTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Completed ({completedTasks.length})</Text>
                  {completedTasks.map((task, idx) => (
                    <View key={task.id || idx} style={[styles.taskCard, styles.completedCard]} testID={`completed-task-${idx}`}>
                      <TouchableOpacity
                        testID={`completed-toggle-${idx}`}
                        style={styles.checkbox}
                        onPress={() => toggleStatus(task)}
                      >
                        <View style={styles.checkboxChecked}>
                          <Ionicons name="checkmark" size={16} color={Colors.text.inverse} />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.taskContent}>
                        <Text style={[styles.taskTitle, styles.completedText]}>{task.title}</Text>
                      </View>
                      {user?.role === 'admin' && (
                        <TouchableOpacity onPress={() => deleteTask(task)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={18} color={Colors.ui.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.brand.maroon, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  addBtnText: { color: Colors.text.inverse, fontWeight: '600', fontSize: FontSizes.sm },
  toggleRow: {
    flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.full,
    padding: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  toggleActive: { backgroundColor: Colors.background.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: FontSizes.sm, color: Colors.text.secondary, fontWeight: '500' },
  toggleTextActive: { color: Colors.brand.maroon, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.secondary, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text.primary },
  emptyText: { fontSize: FontSizes.md, color: Colors.text.secondary },
  taskCard: {
    backgroundColor: Colors.background.card, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.ui.border,
    flexDirection: 'row', alignItems: 'center',
  },
  completedCard: { opacity: 0.7 },
  checkbox: { marginRight: Spacing.md },
  checkboxEmpty: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.brand.maroon,
  },
  checkboxChecked: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.ui.success, justifyContent: 'center', alignItems: 'center',
  },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  completedText: { textDecorationLine: 'line-through', color: Colors.text.secondary },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  taskDeadline: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  overdue: { color: Colors.ui.error, fontWeight: '600' },
  today: { color: Colors.brand.maroon, fontWeight: '600' },
  taskNotes: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { padding: Spacing.sm },
});
