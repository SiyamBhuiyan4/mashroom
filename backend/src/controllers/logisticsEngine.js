import MapNode from '../models/MapNode.js';
import User from '../models/User.js';

// Dijkstra's Algorithm to find the nearest farmer
export const findNearestFarmer = async (buyerNodeId) => {
  // 1. Fetch all nodes and active farmers
  const nodes = await MapNode.find().populate('edges.node');
  const farmers = await User.find({ role: 'farmer', isApproved: true });
  
  if (farmers.length === 0) return null;

  const farmerNodeIds = farmers.map(f => f.locationNode.toString());
  
  // 2. Initialize Dijkstra structures
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  
  nodes.forEach(node => {
    const id = node._id.toString();
    distances[id] = Infinity;
    previous[id] = null;
    unvisited.add(id);
  });
  
  distances[buyerNodeId.toString()] = 0;
  
  // 3. Process graph
  while (unvisited.size > 0) {
    // Find node with minimum distance
    let currentMinNode = null;
    for (let nodeId of unvisited) {
      if (currentMinNode === null || distances[nodeId] < distances[currentMinNode]) {
        currentMinNode = nodeId;
      }
    }
    
    if (distances[currentMinNode] === Infinity) break; // Unreachable nodes
    
    unvisited.delete(currentMinNode);
    
    // Check if current node is a farmer's location
    if (farmerNodeIds.includes(currentMinNode) && currentMinNode !== buyerNodeId.toString()) {
      // Found the nearest farmer!
      const nearestFarmer = farmers.find(f => f.locationNode.toString() === currentMinNode);
      return {
        farmer: nearestFarmer,
        distance: distances[currentMinNode]
      };
    }
    
    // Update neighbors
    const currentNodeObj = nodes.find(n => n._id.toString() === currentMinNode);
    if (currentNodeObj) {
      for (let edge of currentNodeObj.edges) {
        const neighborId = edge.node._id.toString();
        if (unvisited.has(neighborId)) {
          const newDist = distances[currentMinNode] + edge.distance;
          if (newDist < distances[neighborId]) {
            distances[neighborId] = newDist;
            previous[neighborId] = currentMinNode;
          }
        }
      }
    }
  }
  
  // If no farmer is reachable
  return null;
};
