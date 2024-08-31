import { io, util } from '@tensorflow/tfjs-core';
import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

class BundleResourceHandler implements io.IOHandler {
  constructor(
    protected readonly modelJson: io.ModelJSON,
    protected readonly modelWeightsId: Array<string | number>
  ) {
    if (modelJson == null || modelWeightsId == null) {
      throw new Error(
        'Must pass the model json object and the model weights path.'
      );
    }
  }

  async save(): Promise<io.SaveResult> {
    throw new Error(
      'Bundle resource IO handler does not support saving. ' +
        'Consider using asyncStorageIO instead'
    );
  }

  async load(): Promise<io.ModelArtifacts> {
    const weightsAssets = this.modelWeightsId.map((id) => id.toString());
    return this.loadViaImagePicker(weightsAssets);
  }

  async loadViaImagePicker(weightsAssets: string[]): Promise<io.ModelArtifacts> {
    const modelJson = this.modelJson;
    const modelArtifacts: io.ModelArtifacts = Object.assign({}, modelJson);
    modelArtifacts.weightSpecs = modelJson.weightsManifest[0].weights;
    //@ts-ignore
    delete modelArtifacts.weightManifest;

    const weightsDataArray = await Promise.all(
      weightsAssets.map(async (weightsAsset) => {
        let fileUri: string | undefined;

        const result = await launchImageLibrary({
          mediaType: 'photo',
          includeBase64: true,
        });

        if (result.assets && result.assets.length > 0) {
          fileUri = result.assets[0].uri;
        }

        if (!fileUri) {
          throw new Error(`Error loading file from image picker.`);
        }

        const response = await fetch(fileUri);
        const weightData = await response.arrayBuffer();
        return weightData;
      })
    );

    modelArtifacts.weightData = io.concatenateArrayBuffers(weightsDataArray);
    return modelArtifacts;
  }
}

export function bundleResourceIO(
  modelJson: io.ModelJSON,
  modelWeightsId: number | number[]
): io.IOHandler {
  if (typeof modelJson !== 'object') {
    throw new Error(
      'modelJson must be a JavaScript object (and not a string).\n' +
        'Have you wrapped your asset path in a require() statement?'
    );
  }

  if (typeof modelWeightsId === 'string') {
    throw new Error(
      'modelWeightsID must be a number or number array.\n' +
        'Have you wrapped your asset paths in a require() statements?'
    );
  }
  const modelWeightsIdArr = Array.isArray(modelWeightsId)
    ? modelWeightsId
    : [modelWeightsId];
  return new BundleResourceHandler(modelJson, modelWeightsIdArr);
}
