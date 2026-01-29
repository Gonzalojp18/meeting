import React, { useState } from 'react';
import useMenuStore from '../store/menuStore';

const PromotionManager = ({ category }) => {
  const { addPromotion, updatePromotion, deletePromotion } = useMenuStore();
  const [isEditing, setIsEditing] = useState(false);
  const [promotionData, setPromotionData] = useState(
    category.promotion || {
      type: 'info-banner',
      title: '',
      description: '',
      backgroundColor: 'bg-orange-50',
      icon: '',
      image: '',
      itemId: '',
      action: { text: '', link: '' },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (category.promotion) {
      updatePromotion(category.id, promotionData);
    } else {
      addPromotion(category.id, promotionData);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    deletePromotion(category.id);
    setIsEditing(false);
  };

  if (!isEditing && !category.promotion) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Add Promotion
      </button>
    );
  }

  if (!isEditing) {
    return (
      <div className="border p-4 rounded-lg bg-white">
        <h4 className="font-medium mb-2">Current Promotion</h4>
        <p><strong>Type:</strong> {category.promotion.type}</p>
        <p><strong>Title:</strong> {category.promotion.title}</p>
        <p><strong>Description:</strong> {category.promotion.description}</p>
        <div className="mt-4 space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-white">
      <div>
        <label className="block mb-1">Type</label>
        <select
          value={promotionData.type}
          onChange={(e) => setPromotionData({ ...promotionData, type: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="info-banner">Info Banner</option>
          <option value="featured-item">Featured Item</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Title</label>
        <input
          type="text"
          value={promotionData.title}
          onChange={(e) => setPromotionData({ ...promotionData, title: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-1">Description</label>
        <textarea
          value={promotionData.description}
          onChange={(e) => setPromotionData({ ...promotionData, description: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      {promotionData.type === 'info-banner' && (
        <div>
          <label className="block mb-1">Icon (emoji)</label>
          <input
            type="text"
            value={promotionData.icon}
            onChange={(e) => setPromotionData({ ...promotionData, icon: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Example: ☕"
          />
        </div>
      )}

      {promotionData.type === 'featured-item' && (
        <>
          <div>
            <label className="block mb-1">Featured Item</label>
            <select
              value={promotionData.itemId}
              onChange={(e) => setPromotionData({ ...promotionData, itemId: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Item</option>
              {category.items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Promotion Image URL</label>
            <input
              type="url"
              value={promotionData.image}
              onChange={(e) => setPromotionData({ ...promotionData, image: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block mb-1">Button Text</label>
            <input
              type="text"
              value={promotionData.action?.text || ''}
              onChange={(e) => setPromotionData({
                ...promotionData,
                action: { ...promotionData.action, text: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="Order Now"
            />
          </div>

          <div>
            <label className="block mb-1">Button Link</label>
            <input
              type="text"
              value={promotionData.action?.link || ''}
              onChange={(e) => setPromotionData({
                ...promotionData,
                action: { ...promotionData.action, link: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="#item-section"
            />
          </div>
        </>
      )}

      <div className="flex space-x-2">
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {category.promotion ? 'Update' : 'Create'} Promotion
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setPromotionData(category.promotion || {
              type: 'info-banner',
              title: '',
              description: '',
              backgroundColor: 'bg-orange-50',
              icon: '',
              image: '',
              itemId: '',
              action: { text: '', link: '' }
            });
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default PromotionManager;