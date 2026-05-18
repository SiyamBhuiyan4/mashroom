import mongoose from 'mongoose';

const mapNodeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. 'Zone A', 'City Center'
  edges: [{
    node: { type: mongoose.Schema.Types.ObjectId, ref: 'MapNode' },
    distance: { type: Number, required: true }
  }]
});

const MapNode = mongoose.model('MapNode', mapNodeSchema);
export default MapNode;
