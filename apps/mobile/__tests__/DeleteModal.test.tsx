/**
 * DeleteModal — o desenho do mockup, igual ao da web: a pergunta como título, o
 * item citado no corpo e Cancelar (ghost) antes de Excluir (destrutivo).
 * Substitui o Alert.alert nativo, que não carregava tema nem o nome do item.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import DeleteModal from '../src/ui/DeleteModal';

const wrap = async (node: React.ReactElement) => {
  await act(async () => {
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);
  });
};

it('renders nothing while it is closed', async () => {
  await wrap(
    <DeleteModal
      visible={false}
      deletePhrase="Confirm the deletion of this habit?"
      name="Read"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );

  expect(screen.queryByTestId('delete-modal')).toBeNull();
});

it('names the item it is about to remove', async () => {
  await wrap(
    <DeleteModal
      visible
      deletePhrase="Confirm the deletion of this habit?"
      name="Read"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );

  expect(screen.getByText('Confirm the deletion of this habit?')).toBeTruthy();
  expect(screen.getByText(/Read/)).toBeTruthy();
});

it('cancels from the button and from the backdrop', async () => {
  const onCancel = jest.fn();
  await wrap(
    <DeleteModal visible deletePhrase="Delete?" name="Read" onCancel={onCancel} onConfirm={jest.fn()} />,
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-modal-cancel'));
    fireEvent.press(screen.getByTestId('delete-modal-backdrop'));
  });

  expect(onCancel).toHaveBeenCalledTimes(2);
});

it('confirms only from the destructive button', async () => {
  const onConfirm = jest.fn();
  await wrap(
    <DeleteModal visible deletePhrase="Delete?" name="Read" onCancel={jest.fn()} onConfirm={onConfirm} />,
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-modal-confirm'));
  });

  expect(onConfirm).toHaveBeenCalledTimes(1);
});
