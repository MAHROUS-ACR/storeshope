import { useState, useEffect } from "react";
import { MobileWrapper } from "@/components/mobile-wrapper";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/languageContext";
import { t } from "@/lib/translations";
import { toast } from "sonner";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { getProducts } from "@/lib/firebaseOps";

interface Discount {
  id: string;
  productId: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
}

interface Product {
  id: string;
  title: string;
  name?: string;
}

export default function DiscountsPage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productId: "",
    discountPercentage: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      
      // Fetch discounts from Firestore
      const discountsRef = collection(db, "discounts");
      const discountsSnapshot = await getDocs(discountsRef);
      const discountsData = discountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Discount[];
      setDiscounts(discountsData || []);

      // Fetch products from Firebase
      const productsData = await getProducts();
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !formData.discountPercentage || !formData.startDate || !formData.endDate) {
      toast.error("Please fill all fields");
      return;
    }

    setIsAdding(true);
    try {
      const db = getFirestore();
      const discountData = {
        productId: formData.productId,
        discountPercentage: parseFloat(formData.discountPercentage),
        startDate: new Date(formData.startDate + "T00:00:00Z").toISOString(),
        endDate: new Date(formData.endDate + "T23:59:59Z").toISOString(),
      };

      if (editingId) {
        // Update existing discount
        const discountDoc = doc(db, "discounts", editingId);
        await updateDoc(discountDoc, {
          ...discountData,
          updatedAt: new Date(),
        });
        toast.success("Discount updated");
      } else {
        // Add new discount
        const discountsRef = collection(db, "discounts");
        await addDoc(discountsRef, {
          ...discountData,
          createdAt: new Date(),
        });
        toast.success("Discount created");
      }

      setFormData({ productId: "", discountPercentage: "", startDate: "", endDate: "" });
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error saving discount");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;

    try {
      const db = getFirestore();
      const discountDoc = doc(db, "discounts", id);
      await deleteDoc(discountDoc);
      toast.success("Discount deleted");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error deleting discount");
    }
  };

  const handleEdit = (discount: Discount) => {
    setFormData({
      productId: discount.productId,
      discountPercentage: discount.discountPercentage,
      startDate: discount.startDate.split("T")[0],
      endDate: discount.endDate.split("T")[0],
    });
    setEditingId(discount.id);
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => String(p.id) === String(productId));
    return product?.title || product?.name || productId;
  };

  return (
    <MobileWrapper>
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-center gap-4 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Discounts</h1>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-40 w-full">
            <div className="w-full px-5 py-4">
              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 space-y-4">
                <h2 className="font-semibold text-lg">{editingId ? "Edit Discount" : "Add New Discount"}</h2>

                <div>
                  <label className="block text-sm font-semibold mb-2">Product</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="select-product"
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title || product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Discount % </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="10"
                    data-testid="input-discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-black text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                  data-testid="button-save-discount"
                >
                  {isAdding ? "Saving..." : editingId ? "Update" : "Add Discount"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ productId: "", discountPercentage: "", startDate: "", endDate: "" });
                    }}
                    className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </button>
                )}
              </form>

              {/* List */}
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">Active Discounts ({discounts.length})</h2>
                {discounts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No discounts yet</p>
                ) : (
                  discounts.map((discount) => (
                    <div key={discount.id} className="bg-white rounded-lg border border-gray-100 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{getProductName(discount.productId)}</p>
                          <p className="text-sm text-amber-600 font-bold">{discount.discountPercentage}% OFF</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(discount)}
                            className="p-2 hover:bg-blue-50 rounded-lg"
                            data-testid={`button-edit-L.E discount.id}`}
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(discount.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            data-testid={`button-delete-L.E discount.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </MobileWrapper>
  );
}
