import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchVisitors } from "@/redux/visitorSlice";
import { fetchDonors } from "@/redux/donorSlice";
import Layout from "@/components/Layout";
import PageBanner from "@/components/PageBanner";
import api from "@/redux/api";
import { toast } from "sonner";
import { MessageSquare, Send, Users, CheckSquare, Square, Smartphone, AlertCircle, Image as ImageIcon, X, Upload } from "lucide-react";
import img5 from "@/assets/image5.png";

const CampaignsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { visitors } = useSelector((state: RootState) => state.visitor);
  const { donors } = useSelector((state: RootState) => state.donor);

  const [target, setTarget] = useState<"donors" | "visitors" | "both" | "specific">("both");
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchVisitors());
    dispatch(fetchDonors());
  }, [dispatch]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if (!imageFile) {
      toast.error("Header image is required by the approved WhatsApp template.");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content is required.");
      return;
    }
    if (message.length > 1000) {
      toast.error("Message must be less than 1000 characters.");
      return;
    }
    if (target === "specific" && selectedIds.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("target", target);
      formData.append("message", message);
      formData.append("specific_ids", JSON.stringify(selectedIds));
      formData.append("image", imageFile);

      const response = await api.post("/management/send-campaign/", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(response.data.message || "Messages sent successfully!");
      if (target === "specific") setSelectedIds([]);
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to send messages");
    } finally {
      setIsSending(false);
    }
  };

  // Combined deduplicated recipient list
  const rawList = [
    ...donors.map(d => ({ id: `donor_${d.id}`, name: d.name, type: 'Donor', phone: d.phone })),
    ...visitors.map(v => ({ id: `visitor_${v.id}`, name: v.name, type: 'Visitor', phone: v.phone }))
  ].filter(p => p.phone);

  const deduplicatedMap = new Map();
  rawList.forEach(item => {
    let cleanPhone = item.phone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (!deduplicatedMap.has(cleanPhone) || item.type === 'Donor') {
      deduplicatedMap.set(cleanPhone, item);
    }
  });
  const combinedList = Array.from(deduplicatedMap.values());

  return (
    <Layout>
      <PageBanner
        title="WhatsApp Campaigns"
        subtitle="Send WhatsApp notifications to donors and visitors"
        image={img5}
      />
      <div className="container py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Compose panel ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Compose Message
              </h2>

              <div className="space-y-5">
                {/* Target audience */}
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="both">Both Donors &amp; Visitors</option>
                    <option value="donors">All Donors</option>
                    <option value="visitors">All Visitors</option>
                    <option value="specific">Select Specific People</option>
                  </select>
                </div>

                {/* Header Image — REQUIRED */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Header Image
                    <span className="text-destructive font-bold">*</span>
                    <span className="text-muted-foreground font-normal text-xs">(required by the approved template)</span>
                  </label>
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-primary/40 border-dashed rounded-xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-primary">Click to upload header image</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG or WEBP • appears at top of message</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative inline-flex flex-col gap-1">
                      <div className="relative border-2 border-primary/30 rounded-xl overflow-hidden shadow-sm">
                        <img src={imagePreview} alt="Header preview" className="h-40 w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        <button
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md hover:bg-destructive/90 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        ✓ Header image ready
                      </p>
                    </div>
                  )}
                </div>

                {/* Message body — {{1}} */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">
                      Message Body
                      <span className="text-destructive font-bold ml-0.5">*</span>
                      <span className="text-muted-foreground font-normal text-xs ml-1">(fills <code className="bg-muted px-1 rounded">{"{{1}}"}</code> in template)</span>
                    </label>
                    <span className={`text-xs font-medium ${message.length > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {message.length}/1000
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here (in Gujarati or English)..."
                    rows={5}
                    maxLength={1000}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
                  />

                  {/* Template info box */}
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg space-y-2">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Approved Template: <code className="font-mono bg-emerald-100 dark:bg-emerald-900/50 px-1.5 rounded">gau_dham</code> · ID: 17526
                    </p>
                    <div className="bg-white dark:bg-black/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900 text-sm space-y-1 font-medium">
                      <p className="text-emerald-700 dark:text-emerald-300">📷 <span className="text-muted-foreground">[Header Image]</span></p>
                      <p>સુખડેશ્વર ગૌ ધામ</p>
                      <p className="text-primary font-bold">{"{{1}}"} <span className="text-xs font-normal text-muted-foreground">← your message</span></p>
                      <p className="text-muted-foreground text-xs">શ્રી જળારામ ગૌ સેવા ટ્રસ્ટ, ગાંધીનગર</p>
                    </div>
                  </div>
                </div>

                {/* Send button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSend}
                    disabled={isSending || !imageFile || !message.trim()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {isSending ? "Sending..." : "Send WhatsApp Message"}
                  </button>
                </div>
              </div>
            </div>

            {/* Specific recipients table */}
            {target === "specific" && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Select Recipients ({selectedIds.length} selected)
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedIds(combinedList.map(item => item.id))} className="text-xs text-primary hover:underline">Select All</button>
                    <button onClick={() => setSelectedIds([])} className="text-xs text-destructive hover:underline">Clear</button>
                  </div>
                </div>
                <div className="overflow-y-auto p-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left bg-muted/50">
                        <th className="p-3 w-10">Select</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedList.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="p-3 text-center cursor-pointer" onClick={() => toggleSelection(item.id)}>
                              {isSelected ? <CheckSquare className="w-5 h-5 text-primary inline-block" /> : <Square className="w-5 h-5 text-muted-foreground inline-block" />}
                            </td>
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3 font-mono text-xs">{item.phone}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${item.type === 'Donor' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                {item.type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {combinedList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No contacts with valid phone numbers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Preview panel ── */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm sticky top-24">
              <h3 className="font-semibold flex justify-center items-center gap-2 mb-4 text-sm">
                <Smartphone className="w-4 h-4 text-emerald-500" /> WhatsApp Preview
              </h3>

              {/* Phone shell */}
              <div className="bg-[#e5ddd5] dark:bg-[#1a1a1a] rounded-2xl p-3 min-h-[460px] flex flex-col gap-3 relative overflow-hidden">
                <div className="bg-white/70 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5 text-center text-[10px] text-muted-foreground rounded-full w-max mx-auto shadow-sm">
                  Today
                </div>

                {/* Message bubble */}
                <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tr-sm shadow-md w-[92%] self-end overflow-hidden text-sm">
                  {/* Header image slot */}
                  {imagePreview ? (
                    <img src={imagePreview} alt="Header" className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-muted/50 flex flex-col items-center justify-center gap-1 border-b border-border">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground/60">Header image required</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <p className="font-bold text-foreground text-sm">સુખડેશ્વર ગૌ ધામ</p>
                    <p className={`text-sm whitespace-pre-wrap break-words ${message ? 'text-foreground' : 'text-muted-foreground/50 italic text-xs'}`}>
                      {message || "Your message will appear here…"}
                    </p>
                    <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                      શ્રી જળારામ ગૌ સેવા ટ્રસ્ટ, ગાંધીનગર
                    </p>
                    <span className="text-[9px] text-muted-foreground/60 block text-right">12:00 PM ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Validation summary */}
              <div className="mt-3 space-y-1">
                <div className={`flex items-center gap-2 text-xs font-medium ${imageFile ? 'text-emerald-600' : 'text-destructive'}`}>
                  <span>{imageFile ? '✓' : '✗'}</span> Header image {imageFile ? 'ready' : 'missing (required)'}
                </div>
                <div className={`flex items-center gap-2 text-xs font-medium ${message.trim() ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  <span>{message.trim() ? '✓' : '○'}</span> Message body {message.trim() ? 'ready' : 'empty'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignsPage;
