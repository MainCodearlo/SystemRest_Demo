import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/client';
import imageCompression from 'browser-image-compression';
import ConfirmModal from '../ConfirmModal';
import { Plus, Edit, Trash2, Loader2, X, Image as ImageIcon, Save, Upload, ShoppingBag } from 'lucide-react';

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', price: '', category_id: '', stock: '', image_url: '' });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: prodData } = await supabase.from('productos').select('*, categorias(name)').order('name');
    const { data: catData } = await supabase.from('categorias').select('*');
    setProducts(prodData || []);
    setCategories(catData || []);
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    const { error } = await supabase.from('productos').delete().eq('id', productToDelete.id);
    if(error) alert("Error: " + error.message);
    else fetchData();
    setProductToDelete(null);
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData({ name: product.name, price: product.price, category_id: product.category_id, stock: product.stock || 0, image_url: product.image_url || '' });
    } else {
      setFormData({ name: '', price: '', category_id: categories[0]?.id || '', stock: 100, image_url: '' });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleImageUpload = async () => {
    if (!imageFile) return formData.image_url;
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp' };
      const compressedFile = await imageCompression(imageFile, options);
      const fileName = `${Date.now()}.webp`;
      const { error } = await supabase.storage.from('productos').upload(fileName, compressedFile);
      if (error) throw error;
      const { data } = supabase.storage.from('productos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Error imagen:", error); throw error;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (!formData.name || !formData.price || !formData.category_id) return alert("Faltan datos");
      
      let finalUrl = formData.image_url;
      if (imageFile) finalUrl = await handleImageUpload();

      const data = {
        name: formData.name,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        stock: parseInt(formData.stock),
        image_url: finalUrl
      };

      if (editingProduct) await supabase.from('productos').update(data).eq('id', editingProduct.id);
      else await supabase.from('productos').insert([data]);

      setShowModal(false);
      fetchData(); 
    } catch (err) { alert(err.message); } 
    finally { setUploading(false); }
  };

  return (
    <div className="p-4 md:p-6">
      <ConfirmModal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} onConfirm={confirmDelete} title="¿Eliminar Producto?" message={`Vas a borrar "${productToDelete?.name}".`} />

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="font-bold text-lg text-slate-700">Inventario de Productos</h3>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 w-full md:w-auto justify-center">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 flex flex-col items-center">
          <Loader2 className="animate-spin mb-2 w-8 h-8 text-blue-500"/> Cargando inventario...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl border-slate-200 shadow-sm">
          <table className="w-full text-left bg-white">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Imagen</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    {/* Restaurado: w-12 h-12 y bordes */}
                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{p.name}</td>
                  <td className="p-4">
                     {/* Restaurado: Badge de categoría */}
                     <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 font-medium border border-slate-200">
                       {p.categorias?.name || p.category_id}
                     </span>
                  </td>
                  <td className="p-4">
                    {/* Restaurado: Fuente más grande y "u." */}
                    <span className={`font-bold ${p.stock < 10 ? 'text-red-500' : 'text-slate-600'}`}>
                        {p.stock} u.
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-800">S/{p.price.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                        {/* Restaurado: Botones con transición y colores */}
                        <button onClick={() => openModal(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit size={16}/></button>
                        <button onClick={() => setProductToDelete(p)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">No hay productos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL DE PRODUCTO RESTAURADO --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            {/* Restaurado: Animaciones de entrada y sombra grande */}
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    {/* Area de subida de imagen restaurada */}
                    <div className="flex flex-col items-center justify-center mb-4">
                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden relative group"
                        >
                            {(imageFile || formData.image_url) ? (
                                <img 
                                    src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url} 
                                    className="w-full h-full object-cover" 
                                    alt="Preview"
                                />
                            ) : (
                                <>
                                    <Upload size={24} className="text-slate-400 mb-1"/>
                                    <span className="text-xs text-slate-400 font-bold">Subir Foto</span>
                                </>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold">Cambiar</span>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                        <p className="text-[10px] text-slate-400 mt-2">Se comprimirá automáticamente (Max 200KB)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                            <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Lomo Saltado"/>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 text-slate-700" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Precio (S/)</label>
                            <input type="number" step="0.10" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00"/>
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Stock Inicial</label>
                            <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-blue-500 font-bold text-slate-700" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} placeholder="100"/>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" disabled={uploading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-70">
                            {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTab;