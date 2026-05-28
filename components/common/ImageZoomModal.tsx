import { Modal, Pressable, Text, View } from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";

type Props = {
  visible: boolean;
  imageUrls: string[];
  index?: number;
  onClose: () => void;
};

export default function ImageZoomModal({
  visible,
  imageUrls,
  index = 0,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <Pressable
          onPress={onClose}
          className="absolute top-12 right-5 z-50 bg-black/60 rounded-full px-4 py-2"
        >
          <Text className="text-white text-lg font-black">×</Text>
        </Pressable>

        <ImageViewer
          imageUrls={imageUrls.map((url) => ({ url }))}
          index={index}
          enableSwipeDown
          onSwipeDown={onClose}
          onCancel={onClose}
          saveToLocalByLongPress={false}
          backgroundColor="black"
        />
      </View>
    </Modal>
  );
}