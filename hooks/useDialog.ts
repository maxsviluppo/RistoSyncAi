import { useState } from 'react';

interface DialogState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'delete' | 'prompt';
    onConfirm?: (inputValue?: string) => void;
    onCancel?: () => void;
    inputValue?: string;
    placeholder?: string;
}

export function useDialog() {
    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert'
    });

    const showConfirm = (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                type: 'confirm',
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    const showDelete = (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                type: 'delete',
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    const showAlert = (title: string, message: string): Promise<void> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                type: 'alert',
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve();
                }
            });
        });
    };

    const showSuccess = (title: string, message: string): Promise<void> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                type: 'success',
                onConfirm: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve();
                }
            });
        });
    };

    const closeDialog = () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
    };

    const showPrompt = (title: string, message: string, defaultValue: string = '', placeholder: string = ''): Promise<string | null> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title,
                message,
                type: 'prompt',
                inputValue: defaultValue,
                placeholder: placeholder,
                onConfirm: (val) => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(val || '');
                },
                onCancel: () => {
                    setDialogState(prev => ({ ...prev, isOpen: false }));
                    resolve(null);
                }
            });
        });
    };

    return {
        dialogState,
        showConfirm,
        showDelete,
        showAlert,
        showSuccess,
        showPrompt,
        closeDialog
    };
}
